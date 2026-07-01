"""Bridge API contract — keep in sync with frontend/src/lib/pywebview/types.ts."""

BRIDGE_API_VERSION = "1"

# Public methods exposed on pywebview.api (snake_case on Python side)
BRIDGE_METHODS: tuple[str, ...] = (
    "ping",
    "get_app_info",
    "open_path_dialog",
    "open_folder_dialog",
    "open_input_folder_dialog",
    "open_output_folder_dialog",
    "validate_merge_folders",
    "list_videos_in_folder",
    "probe_videos_in_folder",
    "open_folder_in_explorer",
    "open_media_file",
    "open_image_file_dialog",
    "login",
    "get_ffmpeg_status",
    "get_login_settings",
    "save_login_settings",
    "get_video_merge_settings",
    "save_video_merge_settings",
    "start_video_merge_job",
    "get_video_merge_job_status",
    "cancel_video_merge_job",
    "reset_video_merge_job_display",
    "open_video_file_dialog",
    "get_video_loop_settings",
    "save_video_loop_settings",
    "start_video_loop_job",
    "get_video_loop_job_status",
    "cancel_video_loop_job",
)
