# ffmpeg-python — examples

## Flip video (minimal)

```python
import ffmpeg

(
    ffmpeg
    .input('input.mp4')
    .hflip()
    .output('output.mp4')
    .overwrite_output()
    .run()
)
```

## Thumbnail at timestamp

```python
import ffmpeg

(
    ffmpeg
    .input('in.mp4', ss=5.0)
    .filter('scale', 320, -1)
    .output('thumb.jpg', vframes=1)
    .overwrite_output()
    .run()
)
```

## Probe metadata

```python
import ffmpeg

probe = ffmpeg.probe('in.mp4')
duration = float(probe['format']['duration'])
video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
width, height = int(video['width']), int(video['height'])
```

## Custom executable path

```python
import ffmpeg

stream = ffmpeg.input('in.mp4').output('out.mp4', vcodec='copy')
cmd = ffmpeg.compile(stream, cmd='/usr/local/bin/ffmpeg', overwrite_output=True)
ffmpeg.run(stream, cmd='/usr/local/bin/ffmpeg', overwrite_output=True)
```

## Overlay (multi-input)

```python
import ffmpeg

main = ffmpeg.input('main.mp4')
logo = ffmpeg.input('logo.png')
(
    ffmpeg
    .filter([main, logo], 'overlay', 10, 10)
    .output('out.mp4')
    .overwrite_output()
    .run()
)
```

## Concat two trimmed segments

```python
import ffmpeg

inp = ffmpeg.input('input.mp4')
(
    ffmpeg
    .concat(
        inp.trim(start_frame=10, end_frame=20),
        inp.trim(start_frame=30, end_frame=40),
    )
    .output('out.mp4')
    .overwrite_output()
    .run()
)
```

## Inspect argv (debug)

```python
import ffmpeg

stream = (
    ffmpeg
    .input('in.mp4')
    .output('out.mp4', vcodec='libx264', crf=24)
    .overwrite_output()
)
print(stream.get_args())
print(ffmpeg.compile(stream))
```

## Pipe stdout (single frame as JPEG)

```python
import ffmpeg

out, _ = (
    ffmpeg
    .input('in.mp4')
    .filter('select', 'gte(n,100)')
    .output('pipe:', vframes=1, format='image2', vcodec='mjpeg')
    .overwrite_output()
    .run(capture_stdout=True)
)
```

## Async / streaming

```python
import ffmpeg

process = (
    ffmpeg
    .input('input.mp4')
    .output('pipe:', format='nut')
    .run_async(pipe_stdout=True)
)
```

More: [upstream examples README](https://github.com/kkroening/ffmpeg-python/tree/master/examples).
