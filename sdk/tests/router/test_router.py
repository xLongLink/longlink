import unittest

from longlink.router import Router


class TestRouter(unittest.TestCase):
    def test_match_includes_path_and_query_params(self):
        router = Router()

        @router.get("/users/{user_id}/posts?{filter}&sort={sort_order}")
        async def get_user_posts(user_id: str, filter: str = "", sort_order: str = "asc"):
            return {"user_id": user_id, "filter": filter, "sort": sort_order}

        handler, params = router.match(
            "GET",
            "/users/admin/posts",
            query_string="filter=any&sort=desc",
        )

        self.assertIs(handler, get_user_posts)
        self.assertEqual(
            params,
            {"user_id": "admin", "filter": "any", "sort_order": "desc"},
        )

    def test_match_applies_defaults_for_missing_query(self):
        router = Router()

        @router.get("/users/{user_id}/posts?{filter}&sort={sort_order}")
        async def get_user_posts(user_id: str, filter: str = "", sort_order: str = "asc"):
            return {"user_id": user_id, "filter": filter, "sort": sort_order}

        handler, params = router.match(
            "GET",
            "/users/admin/posts",
            query_string="sort=desc",
        )

        self.assertIs(handler, get_user_posts)
        self.assertEqual(
            params,
            {"user_id": "admin", "filter": "", "sort_order": "desc"},
        )

    def test_match_ignores_unknown_template_params(self):
        router = Router()

        @router.get("/users/{user_id}/posts?{filter}")
        async def get_user_posts(user_id: str):
            return {"user_id": user_id}

        handler, params = router.match(
            "GET",
            "/users/admin/posts",
            query_string="filter=any",
        )

        self.assertIs(handler, get_user_posts)
        self.assertEqual(params, {"user_id": "admin"})


if __name__ == "__main__":
    unittest.main()
