"""JsApi — methods exposed to JavaScript as pywebview.api.*."""

from __future__ import annotations

from python.bridge.js_api_base import JsApiBase
from python.services import get_app_info_dict, open_path_dialog_stub
from python.services.auth_login import sign_in_with_username
from python.services.video_merge.io import (
    enrich_videos_with_duration,
    list_videos_in_folder,
    open_folder_dialog,
    open_folder_in_explorer,
    open_image_file_dialog,
    open_input_folder_dialog,
    open_media_file,
    open_output_folder_dialog,
    validate_merge_folders,
)
from python.services.plugin_downloader import get_ffmpeg_status
from python.services.remove_watermark.listing import list_watermark_video_rows
from python.services.remove_watermark.runtime import get_remove_watermark_service
from python.services.remove_watermark.service import RemoveLogoInput
from python.services.settings_service import (
    get_login_settings,
    get_remove_watermark_settings,
    get_video_merge_settings,
    save_login_settings,
    save_remove_watermark_settings,
    save_video_merge_settings,
)
from python.services.video_merge.job import (
    get_video_merge_job_status,
    request_cancel_video_merge,
    start_video_merge_job,
)


class JsApi(JsApiBase):
    def ping(self, name: str) -> dict[str, str]:
        if not isinstance(name, str) or not name.strip():
            raise ValueError("ping: name must be a non-empty string")
        clean = name.strip()[:200]
        return self._safe_return({"message": f"pong, {clean}!"})

    def get_app_info(self) -> dict[str, str]:
        return self._safe_return(get_app_info_dict())

    def open_path_dialog(self) -> dict[str, str | bool]:
        return self._safe_return(open_path_dialog_stub())

    def open_folder_dialog(self, directory: str = "") -> dict[str, str | bool]:
        if self._bridge is None:
            return self._safe_return(
                {"ok": False, "path": "", "message": "Bridge chưa sẵn sàng."}
            )
        if not isinstance(directory, str):
            raise ValueError("open_folder_dialog: directory must be a string")
        return self._safe_return(open_folder_dialog(self._bridge, directory))

    def open_input_folder_dialog(self, directory: str = "") -> dict[str, str | bool]:
        if self._bridge is None:
            return self._safe_return(
                {"ok": False, "path": "", "message": "Bridge chưa sẵn sàng."}
            )
        if not isinstance(directory, str):
            raise ValueError("open_input_folder_dialog: directory must be a string")
        return self._safe_return(open_input_folder_dialog(self._bridge, directory))

    def open_output_folder_dialog(self, directory: str = "") -> dict[str, str | bool]:
        if self._bridge is None:
            return self._safe_return(
                {"ok": False, "path": "", "message": "Bridge chưa sẵn sàng."}
            )
        if not isinstance(directory, str):
            raise ValueError("open_output_folder_dialog: directory must be a string")
        return self._safe_return(open_output_folder_dialog(self._bridge, directory))

    def validate_merge_folders(
        self, input_folder: str, output_folder: str
    ) -> dict[str, str | bool]:
        if not isinstance(input_folder, str) or not isinstance(output_folder, str):
            raise ValueError("validate_merge_folders: folders must be strings")
        return self._safe_return(validate_merge_folders(input_folder, output_folder))

    def list_videos_in_folder(self, folder: str) -> dict[str, str | bool | list]:
        if not isinstance(folder, str):
            raise ValueError("list_videos_in_folder: folder must be a string")
        return self._safe_return(list_videos_in_folder(folder))

    def probe_videos_in_folder(self, folder: str) -> dict[str, str | bool | list]:
        if not isinstance(folder, str):
            raise ValueError("probe_videos_in_folder: folder must be a string")
        listing = list_videos_in_folder(folder)
        if not listing.get("ok"):
            return self._safe_return(listing)
        videos = enrich_videos_with_duration(listing["videos"])
        listing["videos"] = videos
        return self._safe_return(listing)

    def open_folder_in_explorer(self, folder: str) -> dict[str, str | bool]:
        if not isinstance(folder, str):
            raise ValueError("open_folder_in_explorer: folder must be a string")
        return self._safe_return(open_folder_in_explorer(folder))

    def open_media_file(self, file_path: str) -> dict[str, str | bool]:
        if not isinstance(file_path, str):
            raise ValueError("open_media_file: file_path must be a string")
        return self._safe_return(open_media_file(file_path))

    def open_image_file_dialog(self, directory: str = "") -> dict[str, str | bool]:
        if self._bridge is None:
            return self._safe_return(
                {"ok": False, "path": "", "message": "Bridge chưa sẵn sàng."}
            )
        if not isinstance(directory, str):
            raise ValueError("open_image_file_dialog: directory must be a string")
        return self._safe_return(open_image_file_dialog(self._bridge, directory))

    def login(self, username: str, password: str) -> dict[str, str | int | bool | None]:
        if not isinstance(username, str) or not isinstance(password, str):
            raise ValueError("login: username and password must be strings")
        try:
            user = sign_in_with_username(username, password)
        except ValueError as exc:
            # Expected auth failures are already logged at WARNING in auth_login.
            return self._safe_return({"ok": False, "message": str(exc)})
        return self._safe_return(user)

    def get_ffmpeg_status(self) -> dict[str, str | bool]:
        return self._safe_return(get_ffmpeg_status())

    def get_login_settings(self) -> dict[str, str | bool]:
        return self._safe_return(get_login_settings())

    def save_login_settings(
        self,
        remember_account: bool,
        username: str,
        password: str,
    ) -> dict[str, str | bool]:
        if not isinstance(remember_account, bool):
            raise ValueError("save_login_settings: remember_account must be a boolean")
        if not isinstance(username, str) or not isinstance(password, str):
            raise ValueError("save_login_settings: username and password must be strings")
        return self._safe_return(
            save_login_settings(remember_account, username, password)
        )

    def get_video_merge_settings(self) -> dict[str, str | dict[str, str]]:
        return self._safe_return(get_video_merge_settings())

    def save_video_merge_settings(
        self,
        input_folder: str,
        output_folder: str,
        export_settings: dict,
        mix_rows: list | None = None,
    ) -> dict[str, str | dict[str, str] | list]:
        if not isinstance(input_folder, str) or not isinstance(output_folder, str):
            raise ValueError(
                "save_video_merge_settings: input_folder and output_folder must be strings"
            )
        if not isinstance(export_settings, dict):
            raise ValueError("save_video_merge_settings: export_settings must be an object")
        if mix_rows is not None and not isinstance(mix_rows, list):
            raise ValueError("save_video_merge_settings: mix_rows must be a list")
        return self._safe_return(
            save_video_merge_settings(
                input_folder, output_folder, export_settings, mix_rows
            )
        )

    def start_video_merge_job(
        self,
        input_folder: str,
        output_folder: str,
        mix_rows: list,
        export_settings: dict,
    ) -> dict[str, str | bool]:
        if not isinstance(input_folder, str) or not isinstance(output_folder, str):
            raise ValueError("start_video_merge_job: folders must be strings")
        if not isinstance(mix_rows, list):
            raise ValueError("start_video_merge_job: mix_rows must be a list")
        if not isinstance(export_settings, dict):
            raise ValueError("start_video_merge_job: export_settings must be an object")
        return self._safe_return(
            start_video_merge_job(
                input_folder, output_folder, mix_rows, export_settings
            )
        )

    def get_video_merge_job_status(self) -> dict:
        return self._safe_return(get_video_merge_job_status())

    def cancel_video_merge_job(self) -> dict[str, str | bool]:
        return self._safe_return(request_cancel_video_merge())

    def get_remove_watermark_settings(self) -> dict[str, str | int]:
        return self._safe_return(get_remove_watermark_settings())

    def save_remove_watermark_settings(
        self,
        input_folder: str,
        output_folder: str,
        thread_count: int,
    ) -> dict[str, str | int]:
        if not isinstance(input_folder, str) or not isinstance(output_folder, str):
            raise ValueError(
                "save_remove_watermark_settings: input_folder and output_folder must be strings"
            )
        if not isinstance(thread_count, int):
            raise ValueError("save_remove_watermark_settings: thread_count must be an integer")
        return self._safe_return(
            save_remove_watermark_settings(input_folder, output_folder, thread_count)
        )

    def list_watermark_videos_in_folder(
        self,
        input_folder: str,
        output_folder: str | None = None,
    ) -> list[dict[str, str | int]]:
        if not isinstance(input_folder, str):
            raise ValueError("list_watermark_videos_in_folder: input_folder must be a string")
        if output_folder is not None and not isinstance(output_folder, str):
            raise ValueError("list_watermark_videos_in_folder: output_folder must be a string")
        return self._safe_return(
            list_watermark_video_rows(input_folder, output_folder)
        )

    def remove_watermark_batch(
        self,
        videos: list[dict],
        thread_count: int,
    ) -> list[dict[str, str | int]]:
        if not isinstance(videos, list):
            raise ValueError("remove_watermark_batch: videos must be a list")
        if not isinstance(thread_count, int):
            raise ValueError("remove_watermark_batch: thread_count must be an integer")
        safe_rows: list[RemoveLogoInput] = []
        for row in videos:
            if not isinstance(row, dict):
                continue
            file_name = str(row.get("file_name") or "").strip()
            input_path = str(row.get("input_path") or "").strip()
            output_path = str(row.get("output_path") or "").strip()
            if not input_path or not output_path:
                continue
            bbox_raw = row.get("bbox_pixels")
            bbox: tuple[int, int, int, int] | None = None
            if isinstance(bbox_raw, (list, tuple)) and len(bbox_raw) == 4:
                try:
                    bbox = (
                        int(bbox_raw[0]),
                        int(bbox_raw[1]),
                        int(bbox_raw[2]),
                        int(bbox_raw[3]),
                    )
                except (TypeError, ValueError):
                    bbox = None
            safe_rows.append(
                RemoveLogoInput(
                    file_name=file_name,
                    input_path=input_path,
                    output_path=output_path,
                    bbox_pixels=bbox,
                )
            )
        service = get_remove_watermark_service()
        results = service.process_batch(rows=safe_rows, thread_count=thread_count)
        return self._safe_return(
            [
                {
                    "file_name": item.file_name,
                    "input_path": item.input_path,
                    "output_path": item.output_path,
                    "status": item.status,
                    "progress_pct": item.progress_pct,
                }
                for item in results
            ]
        )

    def get_remove_watermark_progress(self) -> list[dict[str, str | int]]:
        service = get_remove_watermark_service()
        return self._safe_return(service.get_progress_snapshot())

    def cancel_remove_watermark_batch(self) -> dict[str, bool]:
        get_remove_watermark_service().request_cancel()
        return self._safe_return({"ok": True})
