import unittest

from build_note import diagnostics


class BuildDiagnosticsTests(unittest.TestCase):
    def test_environment_warning_does_not_fail_successful_build(self):
        self.assertEqual(diagnostics("LaTeX Warning: You have requested release `2026/06/01'.\nOutput written on main.pdf (9 pages)."), [])

    def test_silent_layout_and_reference_defects_fail(self):
        log = """Overfull \\hbox (12.0pt too wide) in paragraph at lines 4--5
Missing character: There is no 中 in font xyz!
LaTeX Warning: Reference `eq:x' on page 1 undefined on input line 18.
! Undefined control sequence.
"""
        self.assertEqual(len(diagnostics(log)), 4)

    def test_duplicate_labels_are_not_accepted(self):
        self.assertTrue(diagnostics("LaTeX Warning: Label `eq:x' multiply defined."))


if __name__ == "__main__":
    unittest.main()
