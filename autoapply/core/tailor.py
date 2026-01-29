"""Cover letter tailoring utilities."""


def make_cover(base_template: str, job_title: str, company: str, keywords: list[str]) -> str:
    """
    Generate a tailored cover letter from a template.

    Args:
        base_template: Template string with placeholders {JOB}, {COMPANY}, {KEYS}
        job_title: Job title to insert
        company: Company name to insert
        keywords: List of keywords to insert

    Returns:
        Tailored cover letter text
    """
    k = ", ".join([kw for kw in keywords if kw][:3])
    return (
        base_template.replace("{JOB}", job_title or "the role")
        .replace("{COMPANY}", company or "your company")
        .replace("{KEYS}", k or "the requirements")
    )

