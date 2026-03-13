"""
Example Locust load test script for the Heady Drupal site.

This script defines simple user behaviour that can be extended to represent realistic workloads.
See docs/performance/LOAD_TEST_HARNESS.md for more information.
"""

from locust import HttpUser, task, between


class HeadyUser(HttpUser):
    """Simulates a user browsing the Drupal website."""

    wait_time = between(1, 3)

    @task(3)
    def view_homepage(self):
        self.client.get("/")

    @task(1)
    def view_articles(self):
        self.client.get("/api/articles")

    @task(1)
    def login(self):
        # Example: attempt login with anonymous credentials (adjust as needed)
        self.client.post("/api/login", json={"username": "test@example.com", "password": "password"})