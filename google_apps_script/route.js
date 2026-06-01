// --- Constants (sheet layout, HTTP, cache) ---

var HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

var CACHE_TTL_SECONDS = 600;
var CACHE_KEY_ROLES_SCOPES = "roles_scopes_map";
var CACHE_KEY_USER_AUTH_PREFIX = "user_auth_";
var TOKEN_LENGTH = 32;
var USERS_SHEET_NAME = "users";
var ROLES_SHEET_NAME = "roles";
var HEADER_ROW_OFFSET = 1;

// Sheet "users": A=id, B=username, C=password, D=name, E=role, F=token, G=last_login
// 0-based index (getValues row); getRange column = index + 1
var USERS_COL = {
  ID: 0,
  USERNAME: 1,
  PASSWORD: 2,
  NAME: 3,
  ROLE: 4,
  TOKEN: 5,
  LAST_LOGIN: 6,
};

var USERS_COL_COUNT = 7;

// Sheet "roles": A=id, B=role, C=scopes
var ROLES_COL = {
  ID: 0,
  ROLE: 1,
  SCOPES: 2,
};

var ROLES_COL_COUNT = 3;

function sheetColumn(colIndex) {
  return colIndex + 1;
}

// Hàm mã hóa payload sang chuỗi Hex mã hóa Base64 đơn giản
function encryptDataPayload(plainText) {
  try {
    var charCodes = [];
    for (var i = 0; i < plainText.length; i++) {
      charCodes.push(plainText.charCodeAt(i).toString(16));
    }
    return Utilities.base64Encode(charCodes.join("-"));
  } catch (e) {
    return plainText;
  }
}

// Parse chuỗi scopes: "video_editor:write,remove_watermark:write"
function parseScopesList(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return [];
  }
  return raw
    .toString()
    .split(/[,;\s]+/)
    .map(function (part) {
      return part.trim();
    })
    .filter(function (part) {
      return part.length > 0;
    });
}

function getRoleScopesMap() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(CACHE_KEY_ROLES_SCOPES);
  if (cached !== null) {
    return JSON.parse(cached);
  }

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var rolesSheet = spreadsheet.getSheetByName(ROLES_SHEET_NAME);
  var map = {};

  if (rolesSheet) {
    var lastRow = rolesSheet.getLastRow();
    if (lastRow > HEADER_ROW_OFFSET) {
      var roleRows = rolesSheet.getRange(1, 1, lastRow, ROLES_COL_COUNT).getValues();
      for (var i = HEADER_ROW_OFFSET; i < roleRows.length; i++) {
        var roleName = roleRows[i][ROLES_COL.ROLE]
          ? roleRows[i][ROLES_COL.ROLE].toString().trim()
          : "";
        if (!roleName) {
          continue;
        }
        map[roleName] = parseScopesList(roleRows[i][ROLES_COL.SCOPES]);
      }
    }
  }

  cache.put(CACHE_KEY_ROLES_SCOPES, JSON.stringify(map), CACHE_TTL_SECONDS);
  return map;
}

function resolveScopesForRole(roleRaw, roleScopesMap) {
  var roleName = roleRaw ? roleRaw.toString().trim() : "";
  if (!roleName || !roleScopesMap[roleName]) {
    return [];
  }
  return roleScopesMap[roleName];
}

function normalizeRole(raw) {
  return raw ? raw.toString().trim() : "";
}

function buildAuthCacheKey(username) {
  return (
    CACHE_KEY_USER_AUTH_PREFIX +
    Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, username))
  );
}

function readUserRoleFromSheet(sheet, rowIndex) {
  return normalizeRole(sheet.getRange(rowIndex, sheetColumn(USERS_COL.ROLE)).getValue());
}

function writeUserLastLogin(sheet, rowIndex, timestamp) {
  sheet.getRange(rowIndex, sheetColumn(USERS_COL.LAST_LOGIN)).setValue(timestamp);
}

function writeUserTokenAndLastLogin(sheet, rowIndex, token, timestamp) {
  sheet
    .getRange(rowIndex, sheetColumn(USERS_COL.TOKEN), 1, 2)
    .setValues([[token, timestamp]]);
}

// Entrypoint post method
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  var currentTimestamp = new Date().toISOString();

  try {
    // 1. Kiểm tra đầu vào
    if (!e || !e.postData || !e.postData.contents) {
      return output.setContent(
        JSON.stringify({
          statusCode: HTTP_STATUS.BAD_REQUEST,
          status: "error",
          message: "No data provided",
        })
      );
    }

    var requestData = JSON.parse(e.postData.contents);
    var username = requestData.username ? requestData.username.toString().trim() : "";
    var password = requestData.password ? requestData.password.toString().trim() : "";

    if (!username || !password) {
      return output.setContent(
        JSON.stringify({
          statusCode: HTTP_STATUS.BAD_REQUEST,
          status: "error",
          message: "Missing username or password",
        })
      );
    }

    var roleScopesMap = getRoleScopesMap();

    var cache = CacheService.getScriptCache();
    var cacheKey = buildAuthCacheKey(username);
    var cachedUser = cache.get(cacheKey);

    // 2. TRƯỜNG HỢP 1: Đăng nhập bằng dữ liệu từ Cache (Tốc độ ~50ms)
    if (cachedUser !== null) {
      var userData = JSON.parse(cachedUser);

      if (userData.password === password) {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
        var rIndex = parseInt(userData.rowIndex, 10);
        var userRole = normalizeRole(userData.role);

        // Ghi last_login (cột G) và đọc lại role mới nhất (cột E)
        if (!isNaN(rIndex) && rIndex > HEADER_ROW_OFFSET) {
          writeUserLastLogin(sheet, rIndex, currentTimestamp);
          userRole = readUserRoleFromSheet(sheet, rIndex);
        }

        var userScopes = resolveScopesForRole(userRole, roleScopesMap);

        userData.last_login = currentTimestamp;
        userData.role = userRole;
        userData.scopes = userScopes;
        cache.put(cacheKey, JSON.stringify(userData), CACHE_TTL_SECONDS);

        var rawDataSuccess = {
          timestamp: currentTimestamp,
          id: userData.id,
          username: userData.username,
          name: userData.name,
          token: userData.token,
          role: userRole,
          scopes: userScopes,
        };

        return output.setContent(
          JSON.stringify({
            statusCode: HTTP_STATUS.OK,
            status: "success",
            data: encryptDataPayload(JSON.stringify(rawDataSuccess)),
          })
        );
      }
    }

    // 3. TRƯỜNG HỢP 2: Cache hết hạn / Lần đầu đăng nhập -> Quét Sheet gốc
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
    var lastRow = sheet.getLastRow();

    if (lastRow <= HEADER_ROW_OFFSET) {
      return output.setContent(
        JSON.stringify({
          statusCode: HTTP_STATUS.NOT_FOUND,
          status: "error",
          message: "Database is empty",
        })
      );
    }

    var data = sheet.getRange(1, 1, lastRow, USERS_COL_COUNT).getValues();

    for (var i = HEADER_ROW_OFFSET; i < data.length; i++) {
      var dbUsername = data[i][USERS_COL.USERNAME]
        ? data[i][USERS_COL.USERNAME].toString().trim()
        : "";
      var dbPassword = data[i][USERS_COL.PASSWORD]
        ? data[i][USERS_COL.PASSWORD].toString().trim()
        : "";

      if (dbUsername === username && dbPassword === password) {
        var userToken = data[i][USERS_COL.TOKEN] ? data[i][USERS_COL.TOKEN].toString() : "";

        if (!userToken) {
          userToken = Utilities.base64Encode(
            Utilities.computeDigest(
              Utilities.DigestAlgorithm.SHA_256,
              username + Date.now().toString()
            )
          ).substring(0, TOKEN_LENGTH);
        }

        var currentRow = i + 1;

        writeUserTokenAndLastLogin(sheet, currentRow, userToken, currentTimestamp);

        var userRole = normalizeRole(data[i][USERS_COL.ROLE]);
        var userScopes = resolveScopesForRole(userRole, roleScopesMap);

        var cacheObj = {
          id: data[i][USERS_COL.ID],
          username: dbUsername,
          password: password,
          name: data[i][USERS_COL.NAME],
          token: userToken,
          last_login: currentTimestamp,
          rowIndex: currentRow,
          role: userRole,
          scopes: userScopes,
        };
        cache.put(cacheKey, JSON.stringify(cacheObj), CACHE_TTL_SECONDS);

        var rawDataDbSuccess = {
          timestamp: currentTimestamp,
          id: data[i][USERS_COL.ID],
          username: dbUsername,
          name: data[i][USERS_COL.NAME],
          token: userToken,
          role: userRole,
          scopes: userScopes,
        };

        return output.setContent(
          JSON.stringify({
            statusCode: HTTP_STATUS.OK,
            status: "success",
            data: encryptDataPayload(JSON.stringify(rawDataDbSuccess)),
          })
        );
      }
    }

    return output.setContent(
      JSON.stringify({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        status: "error",
        message: "Invalid username or password",
      })
    );
  } catch (error) {
    return output.setContent(
      JSON.stringify({
        statusCode: HTTP_STATUS.INTERNAL_ERROR,
        status: "error",
        message: "Server error: " + error.toString(),
      })
    );
  }
}
