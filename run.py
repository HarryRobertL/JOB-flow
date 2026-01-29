"""Backward-compatible wrapper for autoapply.run.main"""

if __name__ == "__main__":
    import sys
    import argparse
    from autoapply.run import main

    parser = argparse.ArgumentParser(description="Run the auto apply bot.")
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Launch browser in headless mode (default: show window).",
    )
    args = parser.parse_args()

    sys.exit(main(config_path=None, headless=args.headless))
