import unittest

from collect_common import word_pattern


class WordPatternTest(unittest.TestCase):
    def test_accepts_korean_particle_starting_with_eu(self):
        self.assertIsNotNone(word_pattern("Python").search("Python으로 분석했습니다."))

    def test_accepts_korean_copula_ending(self):
        self.assertIsNotNone(word_pattern("프로덕트 디자이너").search("프로덕트 디자이너입니다."))

    def test_rejects_substring_inside_english_word(self):
        self.assertIsNone(word_pattern("Unity").search("community"))

    def test_rejects_short_korean_prefix(self):
        self.assertIsNone(word_pattern("자바").search("자바스크립트"))


if __name__ == "__main__":
    unittest.main()
