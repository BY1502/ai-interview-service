def test_import():
    import app.main as m
    assert callable(getattr(m, "health"))
