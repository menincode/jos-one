"""Tests for video_merge.pipeline."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from python.services.video_merge.io import ExportRenderConfig
from python.services.video_merge import pipeline

RENDER_SAMPLE = """
frame=   32 fps=0.0 q=28.0 size=     512kB time=00:00:01.06 bitrate=3942.0kbits/s speed=2.05x
frame=  120 fps=118 q=24.0 size=    2048kB time=00:00:04.00 bitrate=4194.1kbits/s speed=3.92x
frame=  900 fps=134 q=-1.0 Lsize=   14336kB time=00:00:30.00 bitrate=3912.8kbits/s speed=4.41x
""".strip()


def _videos(*items: tuple[str, float]) -> list[dict]:
    return [
        {
            "name": path.split("/")[-1],
            "path": path,
            "size_bytes": 100,
            "duration_sec": duration,
        }
        for path, duration in items
    ]


def test_parse_duration_from_log_time_progress() -> None:
    log = "frame=  500 fps= 30 time=00:00:45.25 bitrate= 600kbits/s"
    assert pipeline._parse_duration_from_log(log) == 45.25


def test_parse_duration_from_log_render_sample() -> None:
    assert pipeline._parse_duration_from_log(RENDER_SAMPLE) == 30.0


def test_parse_speed_from_log_render_sample() -> None:
    assert pipeline._parse_speed_from_log(RENDER_SAMPLE) == 4.41


def test_plan_single_row_leading_only_in_range() -> None:
    rows = [{"id": "r1", "leading_paths": ["/v/a.mp4", "/v/b.mp4"]}]
    videos = _videos(("/v/a.mp4", 30.0), ("/v/b.mp4", 40.0), ("/v/c.mp4", 20.0))
    result = pipeline.plan_mix_rows(
        rows, videos, duration_min_sec=60, duration_max_sec=90, seed=1
    )
    assert result["ok"] is True
    assert result["rows"][0]["sequence_paths"] == ["/v/a.mp4", "/v/b.mp4"]
    assert result["rows"][0]["tail_paths"] == []


def test_plan_adds_tail_to_reach_min_duration() -> None:
    rows = [{"id": "r1", "leading_paths": ["/v/a.mp4"]}]
    videos = _videos(
        ("/v/a.mp4", 20.0),
        ("/v/b.mp4", 25.0),
        ("/v/c.mp4", 30.0),
    )
    result = pipeline.plan_mix_rows(
        rows, videos, duration_min_sec=60, duration_max_sec=90, seed=42
    )
    assert result["ok"] is True
    row = result["rows"][0]
    assert row["leading_paths"] == ["/v/a.mp4"]
    assert len(row["tail_paths"]) >= 1
    assert 60 <= row["total_duration_sec"] <= 90


def test_plan_tail_unique_across_rows() -> None:
    rows = [
        {"id": "r1", "leading_paths": ["/v/a.mp4"]},
        {"id": "r2", "leading_paths": ["/v/d.mp4"]},
    ]
    videos = _videos(
        ("/v/a.mp4", 15.0),
        ("/v/b.mp4", 20.0),
        ("/v/c.mp4", 25.0),
        ("/v/d.mp4", 15.0),
        ("/v/e.mp4", 20.0),
        ("/v/f.mp4", 25.0),
    )
    result = pipeline.plan_mix_rows(
        rows, videos, duration_min_sec=50, duration_max_sec=80, seed=7
    )
    assert result["ok"] is True
    used_tails: set[str] = set()
    for row in result["rows"]:
        for path in row["tail_paths"]:
            assert path not in used_tails
            used_tails.add(path)


def test_plan_allows_duplicate_leading_across_rows() -> None:
    rows = [
        {"id": "r1", "leading_paths": ["/v/a.mp4"]},
        {"id": "r2", "leading_paths": ["/v/a.mp4"]},
    ]
    videos = _videos(("/v/a.mp4", 30.0), ("/v/b.mp4", 30.0))
    result = pipeline.plan_mix_rows(
        rows, videos, duration_min_sec=30, duration_max_sec=120, seed=1
    )
    assert result["ok"] is True
    assert len(result["rows"]) == 2


def test_plan_tail_finds_non_greedy_subset() -> None:
    rows = [{"id": "r1", "leading_paths": ["/v/a.mp4"]}]
    videos = _videos(
        ("/v/a.mp4", 10.0),
        ("/v/b.mp4", 35.0),
        ("/v/c.mp4", 35.0),
        ("/v/d.mp4", 10.0),
    )
    result = pipeline.plan_mix_rows(
        rows, videos, duration_min_sec=55, duration_max_sec=60, seed=1
    )
    assert result["ok"] is True
    assert 55 <= result["rows"][0]["total_duration_sec"] <= 60


def test_plan_allows_single_tail_clip_over_max() -> None:
    rows = [{"id": "r1", "leading_paths": ["/v/a.mp4"]}]
    videos = _videos(("/v/a.mp4", 10.0), ("/v/b.mp4", 55.0))
    result = pipeline.plan_mix_rows(
        rows, videos, duration_min_sec=60, duration_max_sec=60, seed=1
    )
    assert result["ok"] is True
    row = result["rows"][0]
    assert row["total_duration_sec"] > 60
    assert row["tail_paths"] == ["/v/b.mp4"]


def test_filter_chain_order() -> None:
    chain = pipeline._build_video_filter_chain(1920, 1080, 30, 1.1, 0.95)
    assert chain.startswith("setpts=PTS-STARTPTS,")
    pos_start = chain.index("setpts=PTS-STARTPTS")
    pos_scale = chain.index("scale=")
    pos_fps = chain.index("fps=30")
    pos_speed = chain.index("setpts=PTS/0.950000")
    pos_fmt = chain.index("format=yuv420p")
    assert pos_start < pos_scale < pos_fps < pos_speed < pos_fmt


def test_filter_chain_skips_fps_when_source_matches_export() -> None:
    chain = pipeline._build_video_filter_chain(
        1920,
        1080,
        30,
        1.1,
        0.95,
        source_width=1920,
        source_height=1080,
        source_fps=30.0,
    )
    assert "fps=30" not in chain
    assert "scale=" in chain
    assert "setpts=PTS/0.950000" in chain


def test_filter_chain_keeps_fps_when_source_differs() -> None:
    chain = pipeline._build_video_filter_chain(
        1920,
        1080,
        30,
        1.0,
        1.0,
        source_width=1280,
        source_height=720,
        source_fps=30.0,
    )
    assert "fps=30" in chain


def test_parallel_clip_display_index_stays_on_earliest_pending() -> None:
    assert pipeline._parallel_clip_display_index(total=2, started={1, 2}, done=set()) == 1
    assert pipeline._parallel_clip_display_index(total=2, started={1, 2}, done={1}) == 2
    assert pipeline._parallel_clip_display_index(total=2, started={1, 2}, done={1, 2}) == 2


def test_filter_chain_scale_dimensions_even_for_libx264() -> None:
    import re

    chain = pipeline._build_video_filter_chain(1920, 1080, 30, 1.17, 1.0)
    match = re.search(r"scale=(\d+):(\d+)", chain)
    assert match is not None
    width, height = int(match.group(1)), int(match.group(2))
    assert width % 2 == 0
    assert height % 2 == 0


@pytest.mark.skipif(
    not (
        __import__("python.services.plugin_downloader", fromlist=["get_ffmpeg_path"])
        .get_ffmpeg_path()
        is not None
    ),
    reason="FFmpeg plugins missing",
)
def test_render_segment_succeeds_with_zoom_producing_odd_raw_size(
    tmp_path: Path,
) -> None:
    import subprocess

    from python.services.settings_service import DEFAULT_VIDEO_EXPORT
    from python.services.video_merge.io import parse_export_settings
    from python.services.plugin_downloader import get_ffmpeg_path, get_ffprobe_path

    ffmpeg = get_ffmpeg_path()
    ffprobe = get_ffprobe_path()
    assert ffmpeg is not None and ffprobe is not None

    src = tmp_path / "in.mp4"
    dest = tmp_path / "out.mp4"
    subprocess.run(
        [
            str(ffmpeg),
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=1:size=320x240:rate=15",
            "-f",
            "lavfi",
            "-i",
            "sine=duration=1",
            "-shortest",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            str(src),
        ],
        check=True,
        capture_output=True,
        timeout=60,
    )
    config, err = parse_export_settings(dict(DEFAULT_VIDEO_EXPORT))
    assert err is None and config is not None

    ok, msg = pipeline._render_segment(
        src,
        dest,
        config,
        1.17,
        1.05,
        ffmpeg,
        ffprobe,
    )
    assert ok, msg
    assert dest.is_file()


def test_render_mix_row_passes_row_id_to_segment_tasks(tmp_path: Path) -> None:
    src = tmp_path / "in.mp4"
    src.write_bytes(b"x")
    out = tmp_path / "mix.mp4"
    row_temp = tmp_path / "row"
    config = ExportRenderConfig(
        format_ext="mp4",
        width=320,
        height=240,
        fps=15,
        zoom_min=1.0,
        zoom_max=1.0,
        speed_min=1.0,
        speed_max=1.0,
        logo_path=None,
        logo_position="bottom_right",
        duration_min_sec=10,
        duration_max_sec=120,
        concurrency=2,
    )

    def fake_concat(segments, output_path, ffmpeg_bin, **kwargs):
        output_path.write_bytes(b"ok")
        return True, "", "time=00:00:01.00 speed=1.0x"

    with (
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
        patch.object(pipeline, "_concat_segments", side_effect=fake_concat),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_probe_source_duration", return_value=1.0),
        patch.object(pipeline, "_run_ffmpeg", return_value=(True, "", "")),
    ):
        ok, msg, _, _ = pipeline.render_mix_row(
            row_id="mix-abc-123",
            sequence_paths=[str(src)],
            export_config=config,
            output_path=out,
            temp_dir=row_temp,
            cancel_check=lambda: False,
        )

    assert ok, msg
    assert out.is_file()


def test_render_mix_row_uses_ffmpeg_task_pool(tmp_path: Path) -> None:
    srcs = [tmp_path / f"in{i}.mp4" for i in range(3)]
    for src in srcs:
        src.write_bytes(b"x")
    out = tmp_path / "mix.mp4"
    row_temp = tmp_path / "row"
    config = ExportRenderConfig(
        format_ext="mp4",
        width=320,
        height=240,
        fps=15,
        zoom_min=1.0,
        zoom_max=1.0,
        speed_min=1.0,
        speed_max=1.0,
        logo_path=None,
        logo_position="bottom_right",
        duration_min_sec=10,
        duration_max_sec=120,
        concurrency=2,
    )
    pool_calls: list[tuple[list, int]] = []

    def fake_render_segments(self, tasks, **kwargs):
        pool_calls.append((tasks, self._max_workers))
        return [task.dest_path for task in sorted(tasks, key=lambda t: t.clip_index)]

    def fake_concat(segments, output_path, ffmpeg_bin, **kwargs):
        output_path.write_bytes(b"ok")
        return True, "", "time=00:00:01.00 speed=1.0x"

    with (
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
        patch.object(pipeline, "_concat_segments", side_effect=fake_concat),
        patch(
            "python.services.video_merge.ffmpeg_pool.FfmpegTaskPool.render_segments",
            fake_render_segments,
        ),
    ):
        ok, msg, _, _ = pipeline.render_mix_row(
            row_id="mix-pool",
            sequence_paths=[str(s) for s in srcs],
            export_config=config,
            output_path=out,
            temp_dir=row_temp,
            cancel_check=lambda: False,
        )

    assert ok, msg
    assert len(pool_calls) == 1
    tasks, workers = pool_calls[0]
    assert workers == 2
    assert len(tasks) == 3
    assert [t.clip_index for t in tasks] == [0, 1, 2]
    assert out.is_file()


def test_render_mix_row_clip_progress_formats_speed(tmp_path: Path) -> None:
    src = tmp_path / "in.mp4"
    src.write_bytes(b"x")
    out = tmp_path / "mix.mp4"
    row_temp = tmp_path / "row"
    config = ExportRenderConfig(
        format_ext="mp4",
        width=320,
        height=240,
        fps=15,
        zoom_min=1.0,
        zoom_max=1.0,
        speed_min=1.0,
        speed_max=1.0,
        logo_path=None,
        logo_position="bottom_right",
        duration_min_sec=10,
        duration_max_sec=120,
        concurrency=1,
    )
    progress_messages: list[str] = []

    def fake_render_segments(self, tasks, *, on_clip_progress=None, **kwargs):
        if on_clip_progress is not None:
            on_clip_progress(1, "clip.mp4", 65.0, 2.5)
        return [tasks[0].dest_path]

    def fake_concat(segments, output_path, ffmpeg_bin, **kwargs):
        output_path.write_bytes(b"ok")
        return True, "", "time=00:00:01.00 speed=1.0x"

    def capture_progress(_dur, _speed, message, _phase) -> None:
        progress_messages.append(message)

    with (
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
        patch.object(pipeline, "_concat_segments", side_effect=fake_concat),
        patch(
            "python.services.video_merge.ffmpeg_pool.FfmpegTaskPool.render_segments",
            fake_render_segments,
        ),
    ):
        ok, msg, _, _ = pipeline.render_mix_row(
            row_id="mix-speed",
            sequence_paths=[str(src)],
            export_config=config,
            output_path=out,
            temp_dir=row_temp,
            on_progress=capture_progress,
            cancel_check=lambda: False,
        )

    assert ok, msg
    assert any("2.5x" in message for message in progress_messages)


def test_render_mix_row_pool_preserves_segment_order(tmp_path: Path) -> None:
    srcs = [tmp_path / f"in{i}.mp4" for i in range(3)]
    for src in srcs:
        src.write_bytes(b"x")
    out = tmp_path / "mix.mp4"
    row_temp = tmp_path / "row"
    config = ExportRenderConfig(
        format_ext="mp4",
        width=320,
        height=240,
        fps=15,
        zoom_min=1.0,
        zoom_max=1.0,
        speed_min=1.0,
        speed_max=1.0,
        logo_path=None,
        logo_position="bottom_right",
        duration_min_sec=10,
        duration_max_sec=120,
        concurrency=3,
    )
    concat_order: list[str] = []

    def fake_render(src, dest, config, zoom, speed, ffmpeg_bin, ffprobe_bin, **kwargs):
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(str(src.name))
        return True, ""

    def fake_concat(segments, output_path, ffmpeg_bin, **kwargs):
        concat_order.extend(str(p.name) for p in segments)
        output_path.write_bytes(b"ok")
        return True, "", "time=00:00:01.00 speed=1.0x"

    with (
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
        patch.object(pipeline, "_concat_segments", side_effect=fake_concat),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_probe_source_duration", return_value=1.0),
        patch.object(pipeline, "_run_ffmpeg", return_value=(True, "", "")),
        patch.object(pipeline, "_render_segment", side_effect=fake_render),
    ):
        ok, msg, _, _ = pipeline.render_mix_row(
            row_id="mix-order",
            sequence_paths=[str(s) for s in srcs],
            export_config=config,
            output_path=out,
            temp_dir=row_temp,
            cancel_check=lambda: False,
        )

    assert ok, msg
    assert concat_order == ["seg_0000.mp4", "seg_0001.mp4", "seg_0002.mp4"]


def test_video_codec_args_skips_nvenc_when_nvcuda_missing(monkeypatch) -> None:
    monkeypatch.setattr(pipeline, "_ffmpeg_supports_encoder", lambda *_a, **_k: True)
    monkeypatch.setattr(pipeline, "_nvcuda_runtime_available", lambda: False)
    pipeline.disable_nvenc_runtime()
    pipeline._nvenc_usable.cache_clear()

    args = pipeline._video_codec_args(Path("ffmpeg.exe"))

    assert "libx264" in args
    assert "h264_nvenc" not in args


def test_nvenc_failure_detects_nvcuda_error() -> None:
    log = "[h264_nvenc] Cannot load nvcuda.dll\nConversion failed!"
    cmd = ["ffmpeg", "-c:v", "h264_nvenc", "out.mp4"]
    assert pipeline._nvenc_failure(log, cmd) is True


def test_render_segment_builds_filter_complex(tmp_path: Path) -> None:
    src = tmp_path / "in.mp4"
    dest = tmp_path / "out.mp4"
    src.write_bytes(b"x")
    captured: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        captured.append(cmd)
        dest.write_bytes(b"ok")
        return True, "", ""

    config = ExportRenderConfig(
        format_ext="mp4",
        width=1920,
        height=1080,
        fps=30,
        zoom_min=1.0,
        zoom_max=1.0,
        speed_min=1.0,
        speed_max=1.0,
        logo_path=None,
        logo_position="bottom_right",
        duration_min_sec=60,
        duration_max_sec=90,
        concurrency=4,
    )

    with (
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
        patch.object(pipeline, "_probe_has_audio", return_value=True),
        patch.object(pipeline, "_probe_source_duration", return_value=30.0),
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
    ):
        ok, err = pipeline._render_segment(
            src, dest, config, 1.0, 1.0, Path("ffmpeg"), Path("ffprobe")
        )

    assert ok, err
    cmd = captured[0]
    fc_idx = cmd.index("-filter_complex")
    fc = cmd[fc_idx + 1]
    assert "scale=" in fc
    assert "fps=30" in fc
    assert "libx264" in cmd
    assert "nvenc" not in " ".join(cmd).lower()


def _segment_config(*, logo_path: str | None = None) -> ExportRenderConfig:
    return ExportRenderConfig(
        format_ext="mp4",
        width=1920,
        height=1080,
        fps=30,
        zoom_min=1.0,
        zoom_max=1.0,
        speed_min=1.0,
        speed_max=1.0,
        logo_path=logo_path,
        logo_position="bottom_right",
        duration_min_sec=60,
        duration_max_sec=90,
        concurrency=4,
    )


def test_render_segment_includes_logo_overlay_when_logo_configured(
    tmp_path: Path,
) -> None:
    src = tmp_path / "in.mp4"
    dest = tmp_path / "out.mp4"
    logo = tmp_path / "logo.png"
    src.write_bytes(b"x")
    logo.write_bytes(b"\x89PNG\r\n\x1a\n")
    captured: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        captured.append(cmd)
        dest.write_bytes(b"ok")
        return True, "", ""

    config = _segment_config(logo_path=str(logo))

    with (
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_probe_source_duration", return_value=30.0),
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
    ):
        ok, err = pipeline._render_segment(
            src, dest, config, 1.0, 1.0, Path("ffmpeg"), Path("ffprobe")
        )

    assert ok, err
    cmd = captured[0]
    assert cmd.count("-i") == 2
    fc_idx = cmd.index("-filter_complex")
    fc = cmd[fc_idx + 1]
    assert "format=rgba" in fc
    assert "overlay=" in fc
    assert "[vnorm]" in fc


def test_render_segment_skips_logo_when_file_missing(tmp_path: Path) -> None:
    src = tmp_path / "in.mp4"
    dest = tmp_path / "out.mp4"
    src.write_bytes(b"x")
    captured: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        captured.append(cmd)
        dest.write_bytes(b"ok")
        return True, "", ""

    config = _segment_config(logo_path="/nonexistent/logo.png")

    with (
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_probe_source_duration", return_value=30.0),
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
    ):
        ok, err = pipeline._render_segment(
            src, dest, config, 1.0, 1.0, Path("ffmpeg"), Path("ffprobe")
        )

    assert ok, err
    cmd = captured[0]
    assert cmd.count("-i") == 1
    fc = cmd[cmd.index("-filter_complex") + 1]
    assert "overlay=" not in fc


def test_concat_segments_uses_concat_demuxer(tmp_path: Path) -> None:
    seg = tmp_path / "seg.mp4"
    seg.write_bytes(b"x")
    out = tmp_path / "mix.mp4"
    captured: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        captured.append(cmd)
        out.write_bytes(b"ok")
        return True, "", "time=00:00:10.00 speed=2.0x"

    with patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run):
        ok, msg, _log = pipeline._concat_segments([seg], out, Path("ffmpeg"))
    assert ok, msg
    cmd = captured[0]
    cmd_str = " ".join(cmd).lower()
    assert "-f" in cmd and "concat" in cmd
    assert "-c" in cmd and "copy" in cmd
    assert cmd.count("-i") == 1
    assert "libx264" not in cmd_str
    assert "nvenc" not in cmd_str


def test_format_ffmpeg_cmd_quotes_paths_with_spaces() -> None:
    cmd = ["ffmpeg", "-i", r"C:\my videos\in.mp4", "-y", "out.mp4"]
    formatted = pipeline._format_ffmpeg_cmd(cmd)
    assert "ffmpeg" in formatted
    assert "my videos" in formatted


def test_run_ffmpeg_logs_command_and_stdout(caplog) -> None:
    import logging

    caplog.set_level(logging.INFO, logger="ffmpeg")
    caplog.set_level(logging.DEBUG, logger="ffmpeg")

    class _LineStream:
        def __init__(self, lines: list[str]) -> None:
            self._lines = lines

        def __iter__(self):
            return iter(self._lines)

    fake_proc = MagicMock()
    fake_proc.stdout = _LineStream(["progress line\n"])
    fake_proc.stderr = _LineStream(["frame=1 time=00:00:01.00 speed=1.0x\n"])
    fake_proc.poll = MagicMock(side_effect=[None, 0])
    fake_proc.returncode = 0

    cmd = ["ffmpeg", "-y", "-i", "in.mp4", "out.mp4"]
    with patch.object(pipeline.subprocess, "Popen", return_value=fake_proc):
        ok, msg, log = pipeline._run_ffmpeg(cmd)

    assert ok, msg
    assert "frame=1" in log
    messages = [record.message for record in caplog.records if record.name == "ffmpeg"]
    assert any("FFmpeg command:" in message for message in messages)
    assert any("ffmpeg" in message and "in.mp4" in message for message in messages)
    assert any("FFmpeg stdout: progress line" in message for message in messages)
    assert any("finished successfully" in message for message in messages)


def test_run_ffmpeg_logs_warning_on_nonzero_exit(caplog) -> None:
    import logging

    caplog.set_level(logging.WARNING, logger="ffmpeg")

    class _LineStream:
        def __init__(self, lines: list[str]) -> None:
            self._lines = lines

        def __iter__(self):
            return iter(self._lines)

    fake_proc = MagicMock()
    fake_proc.stdout = _LineStream([])
    fake_proc.stderr = _LineStream(["Error: invalid data\n"])
    fake_proc.poll = MagicMock(side_effect=[None, 1])
    fake_proc.returncode = 1

    with patch.object(pipeline.subprocess, "Popen", return_value=fake_proc):
        ok, msg, log = pipeline._run_ffmpeg(["ffmpeg", "-bad"])

    assert not ok
    assert "FFmpeg lỗi" in msg
    assert "invalid data" in log
    assert any(
        "exited with code 1" in record.message
        for record in caplog.records
        if record.name == "ffmpeg"
    )
