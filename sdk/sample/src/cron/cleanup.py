from longlink import cron


@cron("0 0 * * *")
async def daily_cleanup_cron_job():
    # Logic for cleaning up old data
    print("Executing daily cleanup cron job")
