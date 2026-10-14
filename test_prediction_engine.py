"""
Test suite for LearnPilot AI Prediction Engine
Tests:
1. Empty history
2. Single assessment attempt
3. Two assessment attempts
4. Improving trend
5. Declining trend
6. Stable trend
7. Missing/malformed data handling
8. Extreme scores and outliers (bounded [0, 100])
9. Prediction intervals and uncertainty handling
"""

import unittest
from prediction_engine import calculate_forecast


class TestPredictionEngine(unittest.TestCase):

    def test_empty_history(self):
        """Empty history returns hasEnoughData = False and 0 predictions."""
        result = calculate_forecast([])
        self.assertFalse(result["hasEnoughData"])
        self.assertEqual(result["confidenceLevel"], "Low")
        self.assertEqual(result["predictedScoreNextWeek"], 0.0)
        self.assertEqual(result["dataPointsCount"], 0)
        self.assertIn("Insufficient assessment history", result["influencingFactors"][0])

    def test_single_assessment(self):
        """Single assessment attempt cannot calibrate a trend and returns hasEnoughData = False."""
        single = [{"percentage": 75.0, "timestamp": "2026-10-01T10:00:00Z"}]
        result = calculate_forecast(single)
        self.assertFalse(result["hasEnoughData"])
        self.assertEqual(result["dataPointsCount"], 1)
        self.assertEqual(result["currentMeasuredScore"], 75.0)
        self.assertEqual(result["predictedScoreNextWeek"], 0.0)

    def test_two_assessments_establishes_baseline(self):
        """Two assessments establish an empirical baseline and forecast."""
        history = [
            {"percentage": 70.0, "timestamp": "2026-10-01T10:00:00Z"},
            {"percentage": 78.0, "timestamp": "2026-10-05T10:00:00Z"}
        ]
        result = calculate_forecast(history)
        self.assertTrue(result["hasEnoughData"])
        self.assertEqual(result["dataPointsCount"], 2)
        self.assertGreaterEqual(result["currentMeasuredScore"], 70.0)
        self.assertLessEqual(result["currentMeasuredScore"], 78.0)
        # Prediction must be bounded
        self.assertGreaterEqual(result["predictedScoreNextWeek"], 0.0)
        self.assertLessEqual(result["predictedScoreNextWeek"], 100.0)
        # Score range min <= predicted <= score range max
        self.assertLessEqual(result["scoreRangeMin"], result["predictedScoreNextWeek"])
        self.assertGreaterEqual(result["scoreRangeMax"], result["predictedScoreNextWeek"])

    def test_improving_trend(self):
        """Consistently improving test scores produce positive momentum."""
        improving_history = [
            {"percentage": 60.0, "timestamp": "2026-10-01T10:00:00Z"},
            {"percentage": 68.0, "timestamp": "2026-10-04T10:00:00Z"},
            {"percentage": 75.0, "timestamp": "2026-10-08T10:00:00Z"},
            {"percentage": 82.0, "timestamp": "2026-10-12T10:00:00Z"}
        ]
        result = calculate_forecast(improving_history)
        self.assertTrue(result["hasEnoughData"])
        self.assertGreater(result["predictedScoreNextWeek"], 70.0)
        # Should detect positive momentum
        factors_text = " ".join(result["influencingFactors"])
        self.assertIn("Positive momentum", factors_text)

    def test_declining_trend(self):
        """Declining scores produce downward trajectory with safeguard capping."""
        declining_history = [
            {"percentage": 85.0, "timestamp": "2026-10-01T10:00:00Z"},
            {"percentage": 78.0, "timestamp": "2026-10-04T10:00:00Z"},
            {"percentage": 70.0, "timestamp": "2026-10-08T10:00:00Z"},
            {"percentage": 62.0, "timestamp": "2026-10-12T10:00:00Z"}
        ]
        result = calculate_forecast(declining_history)
        self.assertTrue(result["hasEnoughData"])
        self.assertLess(result["predictedScoreNextWeek"], 80.0)
        factors_text = " ".join(result["influencingFactors"])
        self.assertIn("downward volatility", factors_text)

    def test_stable_trend(self):
        """Stable scores with low variance maintain consistent plateau."""
        stable_history = [
            {"percentage": 74.0, "timestamp": "2026-10-01T10:00:00Z"},
            {"percentage": 75.0, "timestamp": "2026-10-04T10:00:00Z"},
            {"percentage": 74.5, "timestamp": "2026-10-08T10:00:00Z"},
            {"percentage": 75.0, "timestamp": "2026-10-12T10:00:00Z"}
        ]
        result = calculate_forecast(stable_history)
        self.assertTrue(result["hasEnoughData"])
        self.assertAlmostEqual(result["predictedScoreNextWeek"], 75.0, delta=2.5)

    def test_missing_and_malformed_data(self):
        """Engine safely handles records with missing fields without crashing."""
        malformed_history = [
            {"percentage": "invalid", "timestamp": None},
            {"percentage": 80.0, "timestamp": "2026-10-05T10:00:00Z"},
            {}
        ]
        # Shouldn't raise exception
        result = calculate_forecast(malformed_history)
        self.assertIsInstance(result, dict)

    def test_extreme_scores_and_outliers(self):
        """Scores at 0% or 100% or extreme slopes remain strictly clamped in [0, 100]."""
        extreme_history = [
            {"percentage": 98.0, "timestamp": "2026-10-01T10:00:00Z"},
            {"percentage": 100.0, "timestamp": "2026-10-04T10:00:00Z"},
            {"percentage": 100.0, "timestamp": "2026-10-08T10:00:00Z"}
        ]
        result = calculate_forecast(extreme_history)
        self.assertLessEqual(result["predictedScoreNextWeek"], 100.0)
        self.assertLessEqual(result["scoreRangeMax"], 100.0)

        zero_history = [
            {"percentage": 5.0, "timestamp": "2026-10-01T10:00:00Z"},
            {"percentage": 0.0, "timestamp": "2026-10-04T10:00:00Z"}
        ]
        result_zero = calculate_forecast(zero_history)
        self.assertGreaterEqual(result_zero["predictedScoreNextWeek"], 0.0)
        self.assertGreaterEqual(result_zero["scoreRangeMin"], 0.0)

    def test_topic_wise_risk_and_trend(self):
        """Questions evaluated under specific topics correctly deduce topic mastery and risk."""
        history = [
            {
                "percentage": 70.0,
                "timestamp": "2026-10-01T10:00:00Z",
                "questionEvaluations": [
                    {"topic": "Calculus", "maxMarks": 10, "awardedMarks": 3},
                    {"topic": "Algebra", "maxMarks": 10, "awardedMarks": 9}
                ]
            },
            {
                "percentage": 75.0,
                "timestamp": "2026-10-05T10:00:00Z",
                "questionEvaluations": [
                    {"topic": "Calculus", "maxMarks": 10, "awardedMarks": 4},
                    {"topic": "Algebra", "maxMarks": 10, "awardedMarks": 10}
                ]
            }
        ]
        result = calculate_forecast(history)
        topic_map = {t["topicName"]: t for t in result["topicForecasts"]}
        self.assertIn("Calculus", topic_map)
        self.assertIn("Algebra", topic_map)
        self.assertEqual(topic_map["Calculus"]["riskLevel"], "high_risk")
        self.assertEqual(topic_map["Algebra"]["riskLevel"], "strong")


if __name__ == "__main__":
    unittest.main()
