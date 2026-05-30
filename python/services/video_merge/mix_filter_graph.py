"""Single-pass FFmpeg filter graph for video mix rows."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from python.services.video_merge import transition_spec
from python.services.video_merge.chapter_timestamps import JoinTransitionPlan
from python.services.video_merge.io import ExportRenderConfig

_LOGO_OVERLAY = {
    "top_left": "10:10",
    "top_center": "(W-w)/2:10",
    "top_right": "W-w-10:10",
    "center_left": "10:(H-h)/2",
    "center": "(W-w)/2:(H-h)/2",
    "center_right": "W-w-10:(H-h)/2",
    "bottom_left": "10:H-h-10",
    "bottom_center": "(W-w)/2:H-h-10",
    "bottom_right": "W-w-10:H-h-10",
}


@dataclass(frozen=True)
class ClipProbe:
    """Per-source clip metadata for unified mix filter planning."""

    path: str
    source_duration: float | None
    has_audio: bool
    source_width: int | None
    source_height: int | None
    source_fps: float | None


def effective_segment_duration(source_duration: float | None, speed: float) -> float:
    """Predict normalized segment length after speed adjustment."""
    if source_duration is None or source_duration <= 0:
        return 0.0
    if speed <= 0:
        return source_duration
    return source_duration / speed


_AUDIO_SAMPLE_RATE = 48000
_AUDIO_FORMAT = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"


def _build_clip_audio_filter(
    *,
    index: int,
    probe: ClipProbe,
    speed: float,
    segment_duration: float,
    build_audio_chain: Callable[..., str],
) -> tuple[str, str]:
    """Per-clip audio branch: real track or silent pad matched to video segment length."""
    audio_out = f"ac{index:02d}"
    if probe.has_audio:
        raw_out = f"{audio_out}raw"
        chain = build_audio_chain(
            speed,
            probe.source_duration,
            audio_in=f"{index}:a",
            audio_out=raw_out,
        )
        return (
            f"{chain};[{raw_out}]{_AUDIO_FORMAT}[{audio_out}]",
            f"[{audio_out}]",
        )

    silent_dur = max(0.05, segment_duration)
    return (
        f"anullsrc=channel_layout=stereo:sample_rate={_AUDIO_SAMPLE_RATE},"
        f"atrim=duration={silent_dur:.3f},asetpts=PTS-STARTPTS[{audio_out}]",
        f"[{audio_out}]",
    )


def build_unified_filter_complex(
    *,
    clip_count: int,
    probes: list[ClipProbe],
    effects: list[tuple[float, float]],
    export_config: ExportRenderConfig,
    join_plan: JoinTransitionPlan,
    segment_durations: list[float],
    build_video_filter_chain: Callable[..., str],
    build_audio_chain: Callable[..., str],
) -> tuple[str, bool, str, str]:
    """Build one filter_complex covering normalize, logo, and join.

    Returns ``(filter_complex, include_audio, video_map_label, audio_map_label)``.
    """
    if clip_count != len(probes) or clip_count != len(effects):
        raise ValueError("clip_count mismatch for unified filter graph")

    logo_path = export_config.logo_path
    use_logo = bool(logo_path and Path(logo_path).is_file())
    logo_input_index = clip_count if use_logo else None
    overlay_pos = _LOGO_OVERLAY.get(
        export_config.logo_position, _LOGO_OVERLAY["bottom_right"]
    )

    has_audio_flags = [probe.has_audio for probe in probes]
    include_audio = any(has_audio_flags)
    parts: list[str] = []
    video_labels: list[str] = []
    audio_labels: list[str] = []

    for index in range(clip_count):
        zoom, speed = effects[index]
        probe = probes[index]
        segment_duration = segment_durations[index]
        vfilter = build_video_filter_chain(
            export_config.width,
            export_config.height,
            export_config.fps,
            zoom,
            speed,
            source_width=probe.source_width,
            source_height=probe.source_height,
            source_fps=probe.source_fps,
            force_fps=True,
        )
        norm_label = f"[vn{index:02d}]"
        parts.append(f"[{index}:v]{vfilter}{norm_label}")

        if use_logo and logo_input_index is not None:
            out_label = f"[vc{index:02d}]"
            logo_label = f"[lg{index:02d}]"
            parts.append(f"[{logo_input_index}:v]format=rgba{logo_label}")
            parts.append(
                f"{norm_label}{logo_label}overlay={overlay_pos}{out_label}"
            )
            video_labels.append(out_label)
        else:
            video_labels.append(norm_label)

        if include_audio:
            audio_filter, audio_label = _build_clip_audio_filter(
                index=index,
                probe=probe,
                speed=speed,
                segment_duration=segment_duration,
                build_audio_chain=build_audio_chain,
            )
            parts.append(audio_filter)
            audio_labels.append(audio_label)

    if clip_count == 1:
        return ";".join(parts), include_audio, video_labels[0], (
            audio_labels[0] if include_audio else ""
        )

    if join_plan.use_xfade:
        parts.append(
            transition_spec.build_xfade_chain(
                video_labels=video_labels,
                audio_labels=audio_labels if include_audio else None,
                durations=segment_durations,
                transitions=list(join_plan.transitions),
                transition_durations=list(join_plan.overlaps),
            )
        )
        return ";".join(parts), include_audio, "[vout]", (
            "[aout]" if include_audio else ""
        )

    parts.append(
        transition_spec.build_concat_chain(
            video_labels=video_labels,
            audio_labels=audio_labels if include_audio else None,
        )
    )
    return ";".join(parts), include_audio, "[vout]", (
        "[aout]" if include_audio else ""
    )


def build_unified_mix_command(
    *,
    sequence_paths: list[str],
    effects: list[tuple[float, float]],
    export_config: ExportRenderConfig,
    output_path: Path,
    ffmpeg_bin: Path,
    join_plan: JoinTransitionPlan,
    segment_durations: list[float],
    probes: list[ClipProbe],
    codec_args: list[str],
    build_video_filter_chain: Callable[..., str],
    build_audio_chain: Callable[..., str],
    aac_args: list[str],
    output_metadata_args: list[str] | None = None,
) -> list[str]:
    """Assemble argv for one-shot mix (all clips + optional logo + join)."""
    filter_complex, include_audio, video_map, audio_map = build_unified_filter_complex(
        clip_count=len(sequence_paths),
        probes=probes,
        effects=effects,
        export_config=export_config,
        join_plan=join_plan,
        segment_durations=segment_durations,
        build_video_filter_chain=build_video_filter_chain,
        build_audio_chain=build_audio_chain,
    )

    cmd = [str(ffmpeg_bin), "-y"]
    for path in sequence_paths:
        cmd.extend(["-i", str(Path(path).resolve())])

    logo_path = export_config.logo_path
    if logo_path and Path(logo_path).is_file():
        cmd.extend(["-i", str(Path(logo_path).resolve())])

    cmd.extend(["-filter_complex", filter_complex, "-map", video_map])
    if include_audio and audio_map:
        cmd.extend(["-map", audio_map, *codec_args])
        cmd.extend(aac_args)
    else:
        cmd.extend(codec_args)
        cmd.append("-an")
    if output_metadata_args:
        cmd.extend(output_metadata_args)
    cmd.append(str(output_path))
    return cmd
