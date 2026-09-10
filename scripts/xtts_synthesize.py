import argparse
import os
import sys

# Chấp thuận điều khoản Coqui CPML để tránh prompt stdin bị treo
os.environ['COQUI_TOS_AGREED'] = '1'


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--text', required=True)
    parser.add_argument('--speaker-wav', required=True)
    parser.add_argument('--language', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    try:
        from TTS.api import TTS
    except Exception as error:
        print(f'XTTS_IMPORT_ERROR: {error}', file=sys.stderr)
        return 2

    try:
        model_name = os.getenv(
            'XTTS_MODEL',
            'tts_models/multilingual/multi-dataset/xtts_v2',
        )
        use_gpu = os.getenv('XTTS_USE_GPU', 'false').lower() == 'true'
        tts = TTS(model_name=model_name, progress_bar=False, gpu=use_gpu)

        lang = args.language.lower()
        supported = getattr(tts, 'languages', None)
        if supported and lang not in supported:
            fallback = os.getenv('XTTS_FALLBACK_LANG', 'en')
            print(
                f'XTTS_WARNING: Language "{lang}" is not supported by {model_name}. '
                f'Supported: {supported}. Falling back to "{fallback}".',
                file=sys.stderr,
            )
            lang = fallback

        tts.tts_to_file(
            text=args.text,
            speaker_wav=args.speaker_wav,
            language=lang,
            file_path=args.output,
        )
        return 0
    except Exception as error:
        print(f'XTTS_SYNTHESIS_ERROR: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
