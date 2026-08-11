from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(0.5, 1.5)

    @task
    def load_homepage(self):
        self.client.get("/")
