"""Command-line interface for AutoApplyer."""

import argparse
import sys
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from autoapply.run import main as run_main

console = Console()


def check_python_version() -> tuple[bool, str]:
    """Check if Python version meets requirements."""
    import sys
    
    current = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    required_spec = ">=3.10"
    
    # Parse requires-python from pyproject.toml
    try:
        # Try Python 3.11+ tomllib first
        try:
            import tomllib
            with open("pyproject.toml", "rb") as f:
                pyproject = tomllib.load(f)
            required_spec = pyproject.get("project", {}).get("requires-python", ">=3.10")
        except ImportError:
            # Fall back to tomli if available
            try:
                import tomli as tomllib
                with open("pyproject.toml", "rb") as f:
                    pyproject = tomllib.load(f)
                required_spec = pyproject.get("project", {}).get("requires-python", ">=3.10")
            except ImportError:
                # If neither available, use default
                pass
    except Exception:
        # If parsing fails, use default
        pass
    
    # Simple check: Python 3.10+
    if sys.version_info >= (3, 10):
        return True, f"Python {current} (required: {required_spec})"
    else:
        return False, f"Python {current} (required: {required_spec})"


def check_playwright_import() -> tuple[bool, str]:
    """Check if Playwright can be imported and get version."""
    try:
        import playwright
        version = playwright.__version__
        return True, f"Playwright {version}"
    except ImportError:
        return False, "Playwright not installed (run: pip install playwright)"


def check_playwright_browsers() -> tuple[bool, str]:
    """Check if Chromium browser is installed."""
    try:
        from playwright.sync_api import sync_playwright
        
        # Try to start a browser context (this will fail if browsers aren't installed)
        pw = sync_playwright().start()
        try:
            browser = pw.chromium.launch(headless=True)
            browser.close()
            pw.stop()
            return True, "Chromium browser installed"
        except Exception as e:
            pw.stop()
            error_msg = str(e)
            if "Executable doesn't exist" in error_msg or "BrowserType.launch" in error_msg:
                return False, "Chromium not installed (run: playwright install chromium)"
            return False, f"Browser check failed: {error_msg[:100]}"
    except Exception as e:
        return False, f"Failed to check browsers: {str(e)[:100]}"


def check_config_file(config_path: Optional[Path] = None) -> tuple[bool, str]:
    """Check if config file exists and can be parsed via load_config."""
    if config_path is None:
        config_path = Path("config.yaml")
    try:
        from autoapply.core.config import ConfigError, load_config

        load_config(config_path)
        return True, f"Config file valid: {config_path}"
    except ConfigError as e:
        return False, str(e).split("\n")[0][:200]
    except Exception as e:
        return False, f"Config error: {str(e)[:150]}"


def run_diagnostics(config_path: Optional[Path] = None) -> int:
    """
    Run environment diagnostics checks.
    
    Args:
        config_path: Optional path to config file to check
        
    Returns:
        0 if all checks pass, 1 otherwise
    """
    console.print("\n[bold cyan]AutoApplyer Environment Diagnostics[/bold cyan]\n")
    
    checks = []
    
    # Python version check
    py_ok, py_msg = check_python_version()
    checks.append(("Python Version", py_ok, py_msg))
    
    # Playwright import check
    pw_import_ok, pw_import_msg = check_playwright_import()
    checks.append(("Playwright Package", pw_import_ok, pw_import_msg))
    
    # Browser installation check
    if pw_import_ok:
        pw_browser_ok, pw_browser_msg = check_playwright_browsers()
        checks.append(("Chromium Browser", pw_browser_ok, pw_browser_msg))
    else:
        checks.append(("Chromium Browser", False, "Skipped (Playwright not installed)"))
    
    # Config file check
    cfg_ok, cfg_msg = check_config_file(config_path)
    checks.append(("Configuration File", cfg_ok, cfg_msg))
    
    # Create results table
    table = Table(title="Diagnostics Results", show_header=True, header_style="bold magenta")
    table.add_column("Check", style="cyan", no_wrap=True)
    table.add_column("Status", justify="center")
    table.add_column("Details", style="white")
    
    all_passed = True
    for name, passed, message in checks:
        status = "[green]✓ PASS[/green]" if passed else "[red]✗ FAIL[/red]"
        table.add_row(name, status, message)
        if not passed:
            all_passed = False
    
    console.print(table)
    console.print()
    
    if all_passed:
        console.print(Panel(
            "[green]All checks passed! Your environment is ready to run AutoApplyer.[/green]",
            title="Success",
            border_style="green",
        ))
        return 0
    else:
        console.print(Panel(
            "[yellow]Some checks failed. Please address the issues above before running AutoApplyer.[/yellow]\n\n"
            "[dim]Common fixes:[/dim]\n"
            "  • Install Playwright: [cyan]pip install playwright[/cyan]\n"
            "  • Install browsers: [cyan]playwright install chromium[/cyan]\n"
            "  • Create config: [cyan]cp config.example.yaml config.yaml[/cyan]",
            title="Issues Found",
            border_style="yellow",
        ))
        return 1


def main() -> int:
    """
    Main CLI entry point.
    
    Returns:
        Exit code (0 for success, non-zero for errors)
    """
    parser = argparse.ArgumentParser(
        description=(
            "AutoApplyer - A job search assistant that helps you automatically apply "
            "to suitable jobs on Indeed, Greenhouse, and Lever. This tool uses your "
            "browser profile to keep you signed in, so you only need to log in once."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with default config.yaml
  autoapply

  # Run a specific search by name
  autoapply --search "retail_assistant_cardiff"

  # Run in headless mode (no browser window)
  autoapply --headless

  # Dry run (test without submitting applications)
  autoapply --dry-run

  # Check if your environment is ready
  autoapply --diagnostics

  # Use a custom config file
  autoapply --config /path/to/my-config.yaml

  # Validate config only (no run)
  autoapply --validate-config-only
  autoapply --validate-config-only --config /path/to/config.yaml
        """,
    )
    
    parser.add_argument(
        "--config",
        type=Path,
        default=None,
        help="Path to configuration YAML file (default: config.yaml in project root)",
    )
    parser.add_argument(
        "--search",
        type=str,
        default=None,
        help="Run only the named search from configuration",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Launch browser in headless mode (default: show window)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate runs without actually submitting applications",
    )
    parser.add_argument(
        "--diagnostics",
        action="store_true",
        help="Run environment diagnostics instead of the main application",
    )
    parser.add_argument(
        "--validate-config-only",
        action="store_true",
        help="Load and validate config, then exit (0 on success, non-zero on failure)",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 0.1.0",
    )

    args = parser.parse_args()

    # Validate config only (no run, no diagnostics)
    if args.validate_config_only:
        from autoapply.core.config import ConfigError, load_config

        path = args.config if args.config is not None else Path("config.yaml")
        try:
            load_config(path)
            console.print(f"[green]Config valid: {path}[/green]")
            return 0
        except ConfigError as e:
            console.print(f"[red]Config validation failed:[/red]\n{e}")
            return 1

    # Run diagnostics if requested
    if args.diagnostics:
        return run_diagnostics(config_path=args.config)
    
    # Resolve config path
    if args.config is None:
        # Default to config.yaml in project root
        config_path = Path("config.yaml")
    else:
        config_path = args.config
    
    # Validate config exists before proceeding
    if not config_path.exists():
        console.print(
            Panel(
                f"[red]Configuration file not found: {config_path}[/red]\n\n"
                f"Create a config.yaml file based on config.example.yaml, or specify a path with --config\n\n"
                f"Run [cyan]autoapply --diagnostics[/cyan] to check your environment.",
                title="Error",
                border_style="red",
            )
        )
        return 1
    
    # Run the main application
    try:
        return run_main(
            config_path=config_path,
            headless=args.headless,
            dry_run=args.dry_run,
            search=args.search,
        )
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrupted by user[/yellow]")
        return 130
    except Exception as e:
        console.print(
            Panel(
                f"[red]Error: {str(e)}[/red]\n\n"
                f"Run [cyan]autoapply --diagnostics[/cyan] to check your environment setup.",
                title="Error",
                border_style="red",
            )
        )
        return 1
