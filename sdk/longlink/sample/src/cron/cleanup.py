from src.app import app


@app.cron("0 0 * * *")
async def daily_cleanup_cron_job():
    # Logic for cleaning up old data
    app.info("Executing daily cleanup cron job")
    app.debug("Debugging daily cleanup cron job")
    app.warning("Warning in daily cleanup cron job")
    app.error("Error in daily cleanup cron job")
    app.critical("Critical issue in daily cleanup cron job")
