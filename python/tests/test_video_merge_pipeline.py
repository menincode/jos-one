"""Tests for video_merge.pipeline."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch
import random

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


def test_x264_codec_args_use_veryfast_preset() -> None:
    args = pipeline._video_codec_args(Path("ffmpeg"))
    if "-c:v" in args and args[args.index("-c:v") + 1] == "libx264":
        preset_idx = args.index("-preset")
        assert args[preset_idx + 1] == "veryfast"


def test_output_metadata_args_match_legacy_ffmpeg_json() -> None:
    flat = " ".join(pipeline.OUTPUT_METADATA_ARGS)
    for key in (
        "album_artist=",
        "album=",
        "language=eng",
        "encoder=",
        "TIT1=",
        "TBPM=",
    ):
        assert key in flat


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
    pos_crop = chain.index("crop=1920:1080")
    pos_fps = chain.index("fps=30")
    pos_speed = chain.index("setpts=PTS/0.950000")
    pos_fmt = chain.index("format=yuv420p")
    assert pos_start < pos_scale < pos_crop < pos_fps < pos_speed < pos_fmt


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


def test_filter_chain_force_fps_when_source_matches_export() -> None:
    chain = pipeline._build_video_filter_chain(
        1920,
        1080,
        30,
        1.1,
        0.95,
        source_width=1920,
        source_height=1080,
        source_fps=29.97,
        force_fps=True,
    )
    assert "fps=30" in chain


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
    assert "crop=1920:1080" in chain


def test_filter_chain_pads_to_export_when_zoom_below_one() -> None:
    chain = pipeline._build_video_filter_chain(1920, 1080, 30, 0.9, 1.0)
    assert "pad=1920:1080" in chain
    assert "crop=1920:1080" not in chain


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


def _fake_unified_ffmpeg_run(cmd, **kwargs):
    output_path = Path(cmd[-1])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(b"ok")
    on_line = kwargs.get("on_stderr_line")
    if on_line is not None:
        on_line("time=00:00:01.00 speed=2.5x\n")
    return True, "", "time=00:00:01.00 speed=2.5x"


def test_render_mix_row_single_clip_unified_ffmpeg(tmp_path: Path) -> None:
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
        scene_transition="none",
    )
    captured: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        captured.append(cmd)
        return _fake_unified_ffmpeg_run(cmd, **kwargs)

    with (
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_probe_source_duration", return_value=1.0),
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
    ):
        ok, msg, _, _, _chaptime = pipeline.render_mix_row(
            row_id="mix-abc-123",
            sequence_paths=[str(src)],
            export_config=config,
            output_path=out,
            temp_dir=row_temp,
            cancel_check=lambda: False,
        )

    assert ok, msg
    assert out.is_file()
    assert len(captured) == 1
    fc = captured[0][captured[0].index("-filter_complex") + 1]
    assert "[0:v]" in fc
    assert "scale=" in fc


def test_render_mix_row_uses_single_ffmpeg_command(tmp_path: Path) -> None:
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
        scene_transition="none",
    )
    run_calls: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        run_calls.append(cmd)
        return _fake_unified_ffmpeg_run(cmd, **kwargs)

    with (
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
        patch.object(pipeline, "_probe_source_duration", return_value=1.0),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
    ):
        ok, msg, _, _, _chaptime = pipeline.render_mix_row(
            row_id="mix-unified",
            sequence_paths=[str(s) for s in srcs],
            export_config=config,
            output_path=out,
            temp_dir=row_temp,
            cancel_check=lambda: False,
        )

    assert ok, msg
    assert len(run_calls) == 1
    cmd = run_calls[0]
    assert cmd.count("-i") == 3
    fc = cmd[cmd.index("-filter_complex") + 1]
    assert "concat=n=3" in fc
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
        scene_transition="none",
    )
    progress_messages: list[str] = []

    def capture_progress(_dur, _speed, message, _phase) -> None:
        progress_messages.append(message)

    with (
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
        patch.object(pipeline, "_probe_source_duration", return_value=1.0),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_run_ffmpeg", side_effect=_fake_unified_ffmpeg_run),
    ):
        ok, msg, _, _, _chaptime = pipeline.render_mix_row(
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
    assert any("Ghép video" in message for message in progress_messages)


def test_render_mix_row_preserves_clip_input_order(tmp_path: Path) -> None:
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
        scene_transition="none",
    )
    captured: list[list[str]] = []

    def fake_run(cmd, **kwargs):
        captured.append(cmd)
        return _fake_unified_ffmpeg_run(cmd, **kwargs)

    with (
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_probe_source_duration", return_value=1.0),
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
    ):
        ok, msg, _, _, _chaptime = pipeline.render_mix_row(
            row_id="mix-order",
            sequence_paths=[str(s) for s in srcs],
            export_config=config,
            output_path=out,
            temp_dir=row_temp,
            cancel_check=lambda: False,
        )

    assert ok, msg
    cmd = captured[0]
    input_paths = [cmd[i + 1] for i, token in enumerate(cmd) if token == "-i"]
    assert [Path(path).name for path in input_paths] == ["in0.mp4", "in1.mp4", "in2.mp4"]


def test_video_codec_args_uses_libx264() -> None:
    args = pipeline._video_codec_args(Path("ffmpeg.exe"))

    assert "libx264" in args
    assert "h264_nvenc" not in args


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
        scene_transition="none",
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
        scene_transition="none",
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


def test_join_segments_uses_xfade_when_transition_enabled(tmp_path: Path) -> None:
    seg0 = tmp_path / "seg0.mp4"
    seg1 = tmp_path / "seg1.mp4"
    seg0.write_bytes(b"a")
    seg1.write_bytes(b"b")
    out = tmp_path / "mix.mp4"
    captured: list[list[str]] = []

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
        scene_transition="fade",
        transition_duration_min_sec=0.4,
        transition_duration_max_sec=0.4,
    )

    def fake_run(cmd, **kwargs):
        captured.append(cmd)
        out.write_bytes(b"ok")
        return True, "", "time=00:00:12.00 speed=3.0x"

    with (
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
        patch.object(pipeline, "_probe_source_duration", return_value=10.0),
        patch.object(pipeline, "_probe_has_audio", return_value=True),
    ):
        ok, msg, _log = pipeline._join_segments(
            [seg0, seg1],
            out,
            config,
            Path("ffmpeg"),
            Path("ffprobe"),
            random.Random(1),
        )

    assert ok, msg
    cmd = captured[0]
    fc = cmd[cmd.index("-filter_complex") + 1]
    assert "xfade=transition=fade" in fc
    assert "acrossfade" in fc
    assert cmd.count("-i") == 2
    assert "-map" in cmd and "[vout]" in cmd


def test_join_segments_uses_concat_copy_when_transition_none(tmp_path: Path) -> None:
    seg0 = tmp_path / "seg0.mp4"
    seg1 = tmp_path / "seg1.mp4"
    seg0.write_bytes(b"a")
    seg1.write_bytes(b"b")
    out = tmp_path / "mix.mp4"
    captured: list[list[str]] = []

    config = _segment_config()

    def fake_run(cmd, **kwargs):
        captured.append(cmd)
        out.write_bytes(b"ok")
        return True, "", "time=00:00:10.00 speed=2.0x"

    with (
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
        patch.object(pipeline, "_probe_source_duration", return_value=10.0),
    ):
        ok, msg, _log = pipeline._join_segments(
            [seg0, seg1],
            out,
            config,
            Path("ffmpeg"),
            Path("ffprobe"),
            random.Random(1),
        )

    assert ok, msg
    cmd = captured[0]
    assert "-f" in cmd and "concat" in cmd
    assert "xfade" not in " ".join(cmd)


def test_format_ffmpeg_cmd_quotes_paths_with_spaces(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from python import path_display

    monkeypatch.setattr(path_display, "use_relative_paths_in_logs", lambda: False)
    cmd = ["ffmpeg", "-i", r"C:\my videos\in.mp4", "-y", "out.mp4"]
    formatted = pipeline._format_ffmpeg_cmd(cmd)
    assert "ffmpeg" in formatted
    assert "my videos" in formatted


def test_format_ffmpeg_cmd_uses_relative_paths(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from python import path_display

    monkeypatch.setattr(path_display, "use_relative_paths_in_logs", lambda: True)
    monkeypatch.setattr(path_display, "path_display_base", lambda: tmp_path)

    src = tmp_path / "test" / "input_folder" / "clip.mp4"
    src.parent.mkdir(parents=True)
    src.write_bytes(b"x")
    ffmpeg = tmp_path / "plugins" / "ffmpeg.exe"
    ffmpeg.parent.mkdir(parents=True)
    ffmpeg.write_bytes(b"x")

    cmd = [str(ffmpeg), "-y", "-i", str(src), "out.mp4"]
    formatted = pipeline._format_ffmpeg_cmd(cmd)

    assert "plugins/ffmpeg.exe" in formatted
    assert "test/input_folder/clip.mp4" in formatted
    assert str(tmp_path) not in formatted


def test_log_ffmpeg_command_before_render(caplog) -> None:
    import logging

    caplog.set_level(logging.INFO)
    cmd = ["ffmpeg", "-y", "-i", "clip.mp4", "out.mp4"]
    pipeline.log_ffmpeg_command_before_render("Render segment clip.mp4 → seg_0001.mp4", cmd)
    pipeline_messages = [
        record.message
        for record in caplog.records
        if record.name == "python.services.video_merge.pipeline"
    ]
    ffmpeg_messages = [record.message for record in caplog.records if record.name == "ffmpeg"]
    assert any("Render segment clip.mp4" in message for message in pipeline_messages)
    assert any("FFmpeg command:" in message and "clip.mp4" in message for message in pipeline_messages)
    assert ffmpeg_messages == pipeline_messages


def test_render_segment_logs_ffmpeg_command_before_run(tmp_path: Path, caplog) -> None:
    import logging

    caplog.set_level(logging.INFO)
    src = tmp_path / "in.mp4"
    dest = tmp_path / "out.mp4"
    src.write_bytes(b"x")
    call_order: list[str] = []

    def fake_run(cmd, **kwargs):
        call_order.append("run")
        dest.write_bytes(b"ok")
        return True, "", ""

    config = _segment_config()

    with (
        patch.object(pipeline, "_run_ffmpeg", side_effect=fake_run),
        patch.object(pipeline, "_probe_has_audio", return_value=False),
        patch.object(pipeline, "_probe_source_duration", return_value=30.0),
        patch.object(pipeline, "_probe_video_stream", return_value=(1920, 1080, 30.0)),
        patch.object(pipeline, "_get_binaries", return_value=(Path("ffmpeg"), Path("ffprobe"))),
    ):
        ok, err = pipeline._render_segment(
            src, dest, config, 1.0, 1.0, Path("ffmpeg"), Path("ffprobe")
        )

    assert ok, err
    assert call_order == ["run"]
    assert any(
        "Render segment in.mp4 → out.mp4 — FFmpeg command:" in record.message
        for record in caplog.records
        if record.name == "python.services.video_merge.pipeline"
    )


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
    assert not any("FFmpeg command:" in message for message in messages)
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
