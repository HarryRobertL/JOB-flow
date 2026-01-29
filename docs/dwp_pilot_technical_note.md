# AutoApplyer: Technical Note for DWP Pilot Reviewers

## Overview

AutoApplyer is a job search automation tool designed to help claimants apply to suitable jobs on job board and applicant tracking system (ATS) websites. The tool uses browser automation to navigate job listings, fill application forms, and submit applications on behalf of the claimant.

This document explains how AutoApplyer operates during the pilot, focusing on security, data handling, and operational safeguards.

## High-Level Functionality

AutoApplyer performs the following operations:

1. **Job Discovery**: Searches job listings on Indeed using configured search criteria (query, location, radius, salary filters, etc.)

2. **Application Submission**: Automatically fills and submits application forms on:
   - **Indeed**: Easy Apply jobs directly on Indeed
   - **Greenhouse**: Jobs that redirect from Indeed to Greenhouse-hosted application forms
   - **Lever**: Jobs that redirect from Indeed to Lever-hosted application forms

3. **Logging**: Records all application attempts, successes, skips, and errors in structured CSV format

4. **Artifact Capture**: Saves screenshots and HTML snapshots of application pages for debugging and verification

## Platform Interactions

During the pilot, AutoApplyer interacts with three platforms:

- **Indeed** (uk.indeed.com): Primary job search platform. AutoApplyer searches for jobs matching configured criteria and applies to "Easy Apply" positions directly on Indeed.

- **Greenhouse** (greenhouse.io): When Indeed listings redirect to Greenhouse-hosted application forms, AutoApplyer navigates to these external forms and completes them.

- **Lever** (jobs.lever.co): Similarly, when Indeed listings redirect to Lever-hosted application forms, AutoApplyer completes these forms.

The tool does not interact with other platforms in this pilot. Support for additional platforms (Workday, Ashby, SmartRecruiters) may be added in future versions but is not active during the pilot. **Workday** support exists **experimentally** (see `config.example.yaml` and the Workday adapter); it is not yet recommended for production pilot use.

## Browser Profile and Authentication

AutoApplyer uses Playwright to control a Chromium browser with a **persistent browser profile**. This approach means:

- **No password storage**: Claimant passwords are never stored in configuration files or in the application code. The claimant signs in manually during the first run, and the browser profile saves the session cookies and authentication state.

- **Persistent sessions**: After the initial sign-in, the browser profile maintains the authenticated session. Subsequent runs use the saved session, so the claimant does not need to sign in again unless the session expires.

- **Profile location**: The browser profile is stored locally in `profiles/default/` directory. This directory contains standard Chromium user data (cookies, local storage, session storage, etc.) but does not contain passwords in plain text.

- **Security implications**: The profile directory should be treated as sensitive data, as it contains authentication tokens. Claimants can delete this directory to clear their authentication state.

## Data Storage

### What is Stored

AutoApplyer writes data to two locations:

#### 1. `data/logs.csv`

A CSV file containing one row per application attempt with the following fields:

- `ts`: ISO-format timestamp (UTC) of the application attempt
- `site`: Platform name (`indeed`, `greenhouse`, `lever`, or `unknown`)
- `job_title`: Job title (if available)
- `company`: Company name (if available)
- `url`: URL of the job listing or application form
- `status`: Outcome of the attempt (`applied`, `skip`, or `error`)
- `notes`: Additional context (e.g., reason for skip, error message)

This log file provides an audit trail of all application activity and is suitable for work coach dashboards.

#### 2. `data/artifacts/`

A directory containing debugging artifacts:

- Screenshots (`.png` files): Full-page screenshots captured at key points during application attempts
- HTML snapshots (`.html` files): Complete HTML source of application pages

These artifacts are captured for error debugging and verification purposes. They may contain personal information (name, email, phone) that was entered into application forms.

### What is NOT Stored

AutoApplyer does **not** store:

- **Email content**: No emails sent or received by the claimant are captured or stored
- **Rejection messages**: Any rejection or response messages from employers are not logged
- **Application responses**: The content of application form submissions beyond what is logged in `logs.csv` (job title, company, URL, status)
- **Password data**: Passwords are never stored in configuration files or logs
- **Personal documents**: CV and cover letter files are referenced by path but their contents are not stored by AutoApplyer

## Data Deletion

Claimants can delete their data after the pilot by removing the following directories:

- `profiles/default/`: Deletes the browser profile and all authentication state
- `data/logs.csv`: Deletes the application log
- `data/artifacts/`: Deletes all screenshots and HTML snapshots
- `data/skips.csv`: Deletes the list of skipped job URLs (if present)

Deleting these directories removes all locally stored data. The `config.yaml` file may also contain personal information (name, email, phone, location) and should be deleted if the claimant wishes to remove all traces of their configuration.

## Rate Limiting and Safeguards

AutoApplyer includes several mechanisms to prevent over-application and maintain human-like behavior:

### Daily Application Caps

- **Global daily cap**: Configured via `limits.daily_apply_cap` in `config.yaml` (e.g., 60 applications per day)
- **Per-search daily cap**: Each search can have its own `daily_cap` (e.g., 15 applications per day for a specific search)
- **Per-site cap**: Optional `per_site_cap` limits applications to a specific platform (e.g., 40 applications per day on Indeed)

When a cap is reached, AutoApplyer stops processing additional jobs and exits.

### Random Delays

- **Between applications**: Configurable random delay range (e.g., 6-18 seconds) between each application attempt
- **Search-level delays**: Each search can specify its own `pause_between_apps_seconds` range
- **Global delays**: Default delay range can be set at the global `limits` level

These delays help ensure that application patterns appear human-like and reduce the risk of triggering anti-automation measures on job board websites.

### Error Handling

- **Retry logic**: Failed applications are retried up to a configurable number of times (default: 2 retries)
- **Error logging**: All errors are logged to `logs.csv` with error messages truncated to 180 characters
- **Graceful degradation**: If a platform becomes unavailable or returns errors, AutoApplyer logs the error and continues with the next job

## Configuration

AutoApplyer is configured via a YAML file (`config.yaml`) that contains:

- **Account information**: Name, email, phone, location (used to fill application forms)
- **File paths**: Paths to CV PDF and cover letter template files
- **Search definitions**: List of job searches with query, location, filters, and limits
- **Application answers**: Pre-configured answers to common application questions
- **Global limits**: Daily caps and delay ranges

The configuration file is stored locally and is not transmitted to any external service. Claimants should not commit this file to version control, and it is excluded via `.gitignore`.

## Analytics and Reporting

AutoApplyer includes an analytics module (`autoapply.analytics`) that processes `data/logs.csv` to produce:

- **Per-week summaries**: Groups application attempts by ISO week (e.g., "2025-W46")
- **Status breakdowns**: Counts of `applied`, `skip`, and `error` outcomes
- **Site-level metrics**: Breakdowns by platform (Indeed, Greenhouse, Lever)

The analytics module can be run via:

```bash
python -m autoapply.analytics
```

This produces a text summary and exports a flattened CSV (`data/summary.csv`) suitable for import into Excel for DWP reporting.

## Security Considerations

1. **Local execution**: AutoApplyer runs entirely on the claimant's local machine. No data is transmitted to external services except the job board websites themselves.

2. **Browser automation**: The tool uses standard browser automation (Playwright/Chromium) and does not bypass website security measures. It interacts with websites as a normal browser would.

3. **Terms of service**: Automating job applications may violate some job board terms of service. Claimants should be aware of this risk.

4. **Rate limiting**: The built-in caps and delays are designed to reduce the risk of account suspension, but cannot guarantee that accounts will not be flagged by job board anti-automation systems.

5. **Data privacy**: The `data/artifacts/` directory may contain personal information entered into application forms. This directory should be treated as sensitive.

## Summary

AutoApplyer is a local automation tool that helps claimants apply to jobs by automating form filling and submission. It stores application logs and debugging artifacts locally, uses persistent browser sessions to avoid password storage, and includes rate limiting to prevent over-application. Claimants can delete all stored data by removing the `profiles/` and `data/` directories.

