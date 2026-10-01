import pytest
from app.services.vector_store import is_front_matter_or_metadata, get_educational_chunks


def test_front_matter_detection_positive():
    """Verify that publishing metadata, copyright, and table of contents are flagged as front-matter."""
    copyright_text = """
    Japanese for Beginners: Second Edition
    Copyright © 2024 by Educational Press Inc.
    All rights reserved. Printed in the United States of America.
    ISBN-13: 978-0-123456-78-9
    Library of Congress Control Number: 2024901234
    Published by Language Master Publishing House, New York.
    """
    assert is_front_matter_or_metadata(copyright_text, page=1) is True

    toc_text = """
    TABLE OF CONTENTS
    Chapter 1: Greetings and Introductions .................... 5
    Chapter 2: Writing Systems (Hiragana & Katakana) .......... 18
    Chapter 3: Essential Particles (wa, ga, o, ni) ............ 35
    Chapter 4: Basic Verbs and Conjugations ................... 52
    Chapter 5: Numbers, Time, and Counters .................... 70
    """
    assert is_front_matter_or_metadata(toc_text, page=2) is True


def test_educational_content_negative():
    """Verify that substantive teaching material is NOT flagged as front-matter."""
    grammar_lesson = """
    Lesson 3: The Topic Marker Particle 'は' (wa)
    In Japanese, the particle は (pronounced 'wa') marks the grammatical topic of the sentence.
    Example: 私は田中です (Watashi wa Tanaka desu - I am Tanaka).
    Key rule: While written with the hiragana character 'ha', it is pronounced 'wa' when used as a topic marker.
    """
    assert is_front_matter_or_metadata(grammar_lesson, page=35) is False

    vocab_lesson = """
    Core Japanese Vocabulary:
    1. こんにちは (Konnichiwa) - Hello / Good afternoon
    2. ありがとう (Arigatou) - Thank you
    3. さようなら (Sayonara) - Goodbye
    4. 食べる (Taberu) - To eat (Ichidan verb)
    5. 飲む (Nomu) - To drink (Godan verb)
    """
    assert is_front_matter_or_metadata(vocab_lesson, page=50) is False


def test_empty_or_none_text():
    """Verify handling of empty or whitespace text."""
    assert is_front_matter_or_metadata("", page=1) is True
    assert is_front_matter_or_metadata("   ", page=1) is True
