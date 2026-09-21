"""Run from backend/:  python -m unittest discover -s tests -t ."""

import unittest

from app.resume_parser import _find_links, _find_phone, _guess_skills


class PhoneTests(unittest.TestCase):
    def test_keeps_the_opening_parenthesis(self):
        # Regression: used to come back as "555) 123-4567".
        self.assertEqual(_find_phone("Jane Doe\n(555) 123-4567\njane@x.com"), "(555) 123-4567")

    def test_common_formats(self):
        for raw in ["+1 555-123-4567", "555.123.4567", "5551234567", "617 555 0142", "1-617-555-0142"]:
            with self.subTest(raw=raw):
                self.assertEqual(_find_phone(f"Boston, MA | {raw} | jane@x.com"), raw)

    def test_labelled_number(self):
        self.assertEqual(_find_phone("Phone: 617-555-0142"), "617-555-0142")

    def test_international(self):
        self.assertEqual(_find_phone("Jane\n+44 20 7946 0958"), "+44 20 7946 0958")

    def test_skips_lookalikes_and_keeps_looking(self):
        # The old parser took the first digit run and gave up if it wasn't a phone.
        text = "Indexed 40K+ filings across 156 000 1000 docs\nExpected Graduation: May 2028\n(617) 555-0142"
        self.assertEqual(_find_phone(text), "(617) 555-0142")

    def test_dates_and_gpa_are_not_phones(self):
        self.assertIsNone(_find_phone("GPA: 3.65 | May 2026 – Jul. 2026 | 2025 2028 | 3,900 proposals"))

    def test_none_when_absent(self):
        self.assertIsNone(_find_phone("Jane Doe\njane@example.com"))

    def test_prefers_the_header_number(self):
        text = "Jane Doe\n(617) 555-0142\n" + "filler\n" * 30 + "Reference: (212) 555-0199"
        self.assertEqual(_find_phone(text), "(617) 555-0142")


class SkillsTests(unittest.TestCase):
    def skills(self, *body):
        return _guess_skills(["Skills", *body, "Experience", "Acme"])

    def test_category_labels_are_dropped(self):
        # Regression: produced "Languages: Python" and "Frameworks & Libraries: React".
        got = self.skills("Languages: Python, Java, HTML/CSS", "Frameworks & Libraries: React, Next.js")
        self.assertEqual(got, ["Python", "Java", "HTML/CSS", "React", "Next.js"])

    def test_brackets_are_not_split(self):
        # Regression: produced "AWS (S3", "SQS", "ECS)".
        got = self.skills("Databases & Cloud: PostgreSQL (pgvector), MongoDB, AWS (S3, SQS, ECS)")
        self.assertEqual(got, ["PostgreSQL (pgvector)", "MongoDB", "AWS (S3, SQS, ECS)"])

    def test_wrapped_bracket_is_rejoined(self):
        got = self.skills("Cloud: AWS (S3, SQS,", "ECS), Docker")
        self.assertEqual(got, ["AWS (S3, SQS, ECS)", "Docker"])

    def test_duplicates_ignoring_case(self):
        self.assertEqual(self.skills("Python, python, SQL", "Tools: SQL"), ["Python", "SQL"])

    def test_stops_at_next_section(self):
        self.assertEqual(self.skills("Python"), ["Python"])


class LinkTests(unittest.TestCase):
    def test_from_text(self):
        text = "Jane Doe\nlinkedin.com/in/jane-doe | github.com/janedoe | janedoe.dev\njane@gmail.com"
        self.assertEqual(
            _find_links(text, []),
            {
                "linkedin_url": "https://www.linkedin.com/in/jane-doe",
                "github_url": "https://github.com/janedoe",
                "website_url": "https://janedoe.dev",
            },
        )

    def test_hyperlink_annotations_win_when_text_only_says_linkedin(self):
        links = [("https://www.linkedin.com/in/jane-doe/", 0.05), ("https://janedoe.dev", 0.05)]
        got = _find_links("Jane Doe\nLinkedIn | Portfolio", links)
        self.assertEqual(got["linkedin_url"], "https://www.linkedin.com/in/jane-doe")
        self.assertEqual(got["website_url"], "https://janedoe.dev")

    def test_github_repo_link_reduces_to_the_profile(self):
        got = _find_links("", [("https://github.com/janedoe/project-x", 0.5)])
        self.assertEqual(got["github_url"], "https://github.com/janedoe")

    def test_project_links_lower_on_the_page_are_not_the_website(self):
        got = _find_links("Jane Doe", [("https://my-demo.vercel.app", 0.6)])
        self.assertIsNone(got["website_url"])

    def test_email_domains_are_not_websites(self):
        self.assertIsNone(_find_links("Jane\njane@mysite.dev | jane@gmail.com", [])["website_url"])

    def test_nothing_found(self):
        self.assertEqual(_find_links("Just some text", []), {"linkedin_url": None, "github_url": None, "website_url": None})


if __name__ == "__main__":
    unittest.main()
