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

// Sheet "roles": cột A=id, B=role, C=scopes
function getRoleScopesMap() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("roles_scopes_map");
  if (cached !== null) {
    return JSON.parse(cached);
  }

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var rolesSheet = spreadsheet.getSheetByName("roles");
  var map = {};

  if (rolesSheet) {
    var lastRow = rolesSheet.getLastRow();
    if (lastRow > 1) {
      var roleRows = rolesSheet.getRange(1, 1, lastRow, 3).getValues();
      for (var i = 1; i < roleRows.length; i++) {
        var roleName = roleRows[i][1] ? roleRows[i][1].toString().trim() : "";
        if (!roleName) {
          continue;
        }
        map[roleName] = parseScopesList(roleRows[i][2]);
      }
    }
  }

  cache.put("roles_scopes_map", JSON.stringify(map), 600);
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

// Entrypoint post method
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  var currentTimestamp = new Date().toISOString();

  try {
    // 1. Kiểm tra đầu vào
    if (!e || !e.postData || !e.postData.contents) {
      return output.setContent(
        JSON.stringify({ statusCode: 400, status: "error", message: "No data provided" })
      );
    }

    var requestData = JSON.parse(e.postData.contents);
    var username = requestData.username ? requestData.username.toString().trim() : "";
    var password = requestData.password ? requestData.password.toString().trim() : "";

    if (!username || !password) {
      return output.setContent(
        JSON.stringify({
          statusCode: 400,
          status: "error",
          message: "Missing username or password",
        })
      );
    }

    var roleScopesMap = getRoleScopesMap();

    // Khởi tạo bộ nhớ đệm Cache
    var cache = CacheService.getScriptCache();
    var cacheKey =
      "user_auth_" +
      Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, username));
    var cachedUser = cache.get(cacheKey);

    // 2. TRƯỜNG HỢP 1: Đăng nhập bằng dữ liệu từ Cache (Tốc độ ~50ms)
    if (cachedUser !== null) {
      var userData = JSON.parse(cachedUser);

      if (userData.password === password) {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");
        var rIndex = parseInt(userData.rowIndex, 10);
        var userRole = normalizeRole(userData.role);

        // Ghi last_login (cột F) và đọc lại role mới nhất (cột G)
        if (!isNaN(rIndex) && rIndex > 1) {
          sheet.getRange(rIndex, 6).setValue(currentTimestamp);
          userRole = normalizeRole(sheet.getRange(rIndex, 7).getValue());
        }

        var userScopes = resolveScopesForRole(userRole, roleScopesMap);

        userData.last_login = currentTimestamp;
        userData.role = userRole;
        userData.scopes = userScopes;
        cache.put(cacheKey, JSON.stringify(userData), 600);

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
            statusCode: 200,
            status: "success",
            data: encryptDataPayload(JSON.stringify(rawDataSuccess)),
          })
        );
      }
    }

    // 3. TRƯỜNG HỢP 2: Cache hết hạn / Lần đầu đăng nhập -> Quét Sheet gốc
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");
    var lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return output.setContent(
        JSON.stringify({ statusCode: 404, status: "error", message: "Database is empty" })
      );
    }

    // Cột A-G: id, username, password, name, token, last_login, role
    var data = sheet.getRange(1, 1, lastRow, 7).getValues();

    for (var i = 1; i < data.length; i++) {
      var dbUsername = data[i][1] ? data[i][1].toString().trim() : "";
      var dbPassword = data[i][2] ? data[i][2].toString().trim() : "";

      if (dbUsername === username && dbPassword === password) {
        var userToken = data[i][4] ? data[i][4].toString() : "";

        // Nếu chưa có token thì tự động cấp mới
        if (!userToken) {
          userToken = Utilities.base64Encode(
            Utilities.computeDigest(
              Utilities.DigestAlgorithm.SHA_256,
              username + Date.now().toString()
            )
          ).substring(0, 32);
        }

        var currentRow = i + 1;

        // Ghi đồng thời Token (cột E) và Last Login (cột F)
        sheet.getRange(currentRow, 5, 1, 2).setValues([[userToken, currentTimestamp]]);

        var userRole = normalizeRole(data[i][6]);
        var userScopes = resolveScopesForRole(userRole, roleScopesMap);

        var cacheObj = {
          id: data[i][0],
          username: dbUsername,
          password: password,
          name: data[i][3],
          token: userToken,
          last_login: currentTimestamp,
          rowIndex: currentRow,
          role: userRole,
          scopes: userScopes,
        };
        cache.put(cacheKey, JSON.stringify(cacheObj), 600);

        var rawDataDbSuccess = {
          timestamp: currentTimestamp,
          id: data[i][0],
          username: dbUsername,
          name: data[i][3],
          token: userToken,
          role: userRole,
          scopes: userScopes,
        };

        return output.setContent(
          JSON.stringify({
            statusCode: 200,
            status: "success",
            data: encryptDataPayload(JSON.stringify(rawDataDbSuccess)),
          })
        );
      }
    }

    return output.setContent(
      JSON.stringify({
        statusCode: 401,
        status: "error",
        message: "Invalid username or password",
      })
    );
  } catch (error) {
    return output.setContent(
      JSON.stringify({
        statusCode: 500,
        status: "error",
        message: "Server error: " + error.toString(),
      })
    );
  }
}
