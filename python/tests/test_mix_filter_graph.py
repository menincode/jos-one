"""Tests for single-pass mix filter graph."""

from __future__ import annotations

from pathlib import Path

from python.services.video_merge import mix_filter_graph, pipeline, transition_spec
from python.services.video_merge.chapter_timestamps import JoinTransitionPlan
from python.services.video_merge.io import ExportRenderConfig


def _config(*, scene_transition: str = "none", logo_path: str | None = None) -> ExportRenderConfig:
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
        scene_transition=scene_transition,
        transition_duration_min_sec=0.5,
        transition_duration_max_sec=0.5,
    )


def test_effective_segment_duration_applies_speed() -> None:
    assert mix_filter_graph.effective_segment_duration(30.0, 1.5) == 20.0


def test_build_unified_filter_complex_single_clip() -> None:
    probes = [
        mix_filter_graph.ClipProbe(
            path="a.mp4",
            source_duration=10.0,
            has_audio=False,
            source_width=1920,
            source_height=1080,
            source_fps=30.0,
        )
    ]
    graph, include_audio, video_map, audio_map = mix_filter_graph.build_unified_filter_complex(
        clip_count=1,
        probes=probes,
        effects=[(1.0, 1.0)],
        export_config=_config(),
        join_plan=JoinTransitionPlan(False, (), ()),
        segment_durations=[10.0],
        build_video_filter_chain=pipeline._build_video_filter_chain,
        build_audio_chain=pipeline._build_audio_chain,
    )
    assert include_audio is False
    assert video_map == "[vn00]"
    assert audio_map == ""
    assert "[0:v]" in graph
    assert "fps=30" in graph
    assert "scale=" in graph
    assert "concat" not in graph
    assert "xfade" not in graph


def test_build_unified_filter_complex_concat_three_clips() -> None:
    probes = [
        mix_filter_graph.ClipProbe("a.mp4", 10.0, False, 1920, 1080, 30.0),
        mix_filter_graph.ClipProbe("b.mp4", 10.0, False, 1920, 1080, 30.0),
        mix_filter_graph.ClipProbe("c.mp4", 10.0, False, 1920, 1080, 30.0),
    ]
    graph, _, video_map, _ = mix_filter_graph.build_unified_filter_complex(
        clip_count=3,
        probes=probes,
        effects=[(1.0, 1.0), (1.0, 1.0), (1.0, 1.0)],
        export_config=_config(),
        join_plan=JoinTransitionPlan(False, (), ()),
        segment_durations=[10.0, 10.0, 10.0],
        build_video_filter_chain=pipeline._build_video_filter_chain,
        build_audio_chain=pipeline._build_audio_chain,
    )
    assert video_map == "[vout]"
    assert "concat=n=3" in graph
    assert "[vn00]" in graph and "[vn01]" in graph and "[vn02]" in graph


def test_build_unified_filter_complex_xfade_and_logo(tmp_path: Path) -> None:
    logo = tmp_path / "logo.png"
    logo.write_bytes(b"png")
    probes = [
        mix_filter_graph.ClipProbe("a.mp4", 10.0, True, 1920, 1080, 30.0),
        mix_filter_graph.ClipProbe("b.mp4", 8.0, True, 1920, 1080, 30.0),
    ]
    graph, include_audio, video_map, audio_map = mix_filter_graph.build_unified_filter_complex(
        clip_count=2,
        probes=probes,
        effects=[(1.0, 1.0), (1.0, 1.0)],
        export_config=_config(scene_transition="fade", logo_path=str(logo)),
        join_plan=JoinTransitionPlan(True, ("fade",), (0.5,)),
        segment_durations=[10.0, 8.0],
        build_video_filter_chain=pipeline._build_video_filter_chain,
        build_audio_chain=pipeline._build_audio_chain,
    )
    assert include_audio is True
    assert video_map == "[vout]"
    assert audio_map == "[aout]"
    assert "overlay=" in graph
    assert "xfade=transition=fade" in graph
    assert "acrossfade" in graph


def test_build_unified_filter_complex_mixed_audio_pads_silence() -> None:
    probes = [
        mix_filter_graph.ClipProbe("a.mp4", 10.0, True, 1920, 1080, 30.0),
        mix_filter_graph.ClipProbe("b.mp4", 8.0, False, 1920, 1080, 30.0),
        mix_filter_graph.ClipProbe("c.mp4", 12.0, True, 1920, 1080, 30.0),
    ]
    graph, include_audio, video_map, audio_map = mix_filter_graph.build_unified_filter_complex(
        clip_count=3,
        probes=probes,
        effects=[(1.0, 1.0), (1.0, 1.0), (1.0, 1.0)],
        export_config=_config(scene_transition="fade"),
        join_plan=JoinTransitionPlan(True, ("fade", "fade"), (0.5, 0.5)),
        segment_durations=[10.0, 8.0, 12.0],
        build_video_filter_chain=pipeline._build_video_filter_chain,
        build_audio_chain=pipeline._build_audio_chain,
    )
    assert include_audio is True
    assert video_map == "[vout]"
    assert audio_map == "[aout]"
    assert "anullsrc" in graph
    assert "acrossfade" in graph
    assert "[0:a]" in graph or "[2:a]" in graph
    assert "atrim=duration=8.000" in graph


def test_build_unified_mix_command_maps_audio_when_any_clip_has_audio(
    tmp_path: Path,
) -> None:
    probes = [
        mix_filter_graph.ClipProbe("a.mp4", 10.0, True, 1920, 1080, 30.0),
        mix_filter_graph.ClipProbe("b.mp4", 8.0, False, 1920, 1080, 30.0),
    ]
    metadata_args = ["-metadata", "language=eng"]
    cmd = mix_filter_graph.build_unified_mix_command(
        sequence_paths=["a.mp4", "b.mp4"],
        effects=[(1.0, 1.0), (1.0, 1.0)],
        export_config=_config(),
        output_path=tmp_path / "out.mp4",
        ffmpeg_bin=Path("ffmpeg"),
        join_plan=JoinTransitionPlan(False, (), ()),
        segment_durations=[10.0, 8.0],
        probes=probes,
        codec_args=["-c:v", "libx264"],
        build_video_filter_chain=pipeline._build_video_filter_chain,
        build_audio_chain=pipeline._build_audio_chain,
        aac_args=["-c:a", "aac", "-b:a", "192k"],
        output_metadata_args=metadata_args,
    )
    assert "-map" in cmd
    assert "[aout]" in cmd or "[ac00]" in " ".join(cmd)
    assert "-an" not in cmd
    assert "-c:a" in cmd
    out_path = str(tmp_path / "out.mp4")
    assert cmd[-1] == out_path
    assert cmd[-3:-1] == metadata_args


def test_build_unified_mix_command_includes_output_metadata_before_path(
    tmp_path: Path,
) -> None:
    probes = [
        mix_filter_graph.ClipProbe("a.mp4", 10.0, False, 1920, 1080, 30.0),
    ]
    cmd = mix_filter_graph.build_unified_mix_command(
        sequence_paths=["a.mp4"],
        effects=[(1.0, 1.0)],
        export_config=_config(),
        output_path=tmp_path / "out.mp4",
        ffmpeg_bin=Path("ffmpeg"),
        join_plan=JoinTransitionPlan(False, (), ()),
        segment_durations=[10.0],
        probes=probes,
        codec_args=["-c:v", "libx264", "-preset", "veryfast"],
        build_video_filter_chain=pipeline._build_video_filter_chain,
        build_audio_chain=pipeline._build_audio_chain,
        aac_args=["-c:a", "aac", "-b:a", "192k"],
        output_metadata_args=pipeline.OUTPUT_METADATA_ARGS,
    )
    out_idx = cmd.index(str(tmp_path / "out.mp4"))
    tail = cmd[out_idx - len(pipeline.OUTPUT_METADATA_ARGS) : out_idx + 1]
    assert tail == pipeline.OUTPUT_METADATA_ARGS + [str(tmp_path / "out.mp4")]
    assert "language=eng" in tail


def test_build_xfade_chain_labeled_matches_legacy_offsets() -> None:
    graph = transition_spec.build_xfade_chain(
        video_labels=["[va]", "[vb]"],
        audio_labels=["[aa]", "[ab]"],
        durations=[10.0, 8.0],
        transitions=["fade"],
        transition_durations=[0.5],
    )
    assert "[va][vb]xfade=transition=fade:duration=0.500:offset=9.500[vout]" in graph
    assert "[aa][ab]acrossfade=d=0.500:c1=tri:c2=tri[aout]" in graph
