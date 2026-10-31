from datetime import datetime, timedelta

def partition(start,end,interval):

    step = timedelta(minutes=interval)
    it =start
    result = []
    while it<end:
        result+=[it]
        it+=step

    return result


def calculate_overlaps(availabilities, interval_minutes=30):
    slot_users = {}

    for avaliability in availabilities:
        blocks = partition(avaliability.start_time, avaliability.end_time, interval_minutes)

        for block in blocks:
            if block not in slot_users:
                slot_users[block] = {}
            slot_users[block][avaliability.user_id] = avaliability.voter_name

    heatmap = {block: len(users) for block, users in slot_users.items()}
    available_users = {block: list(users.values()) for block, users in slot_users.items()}
    return heatmap, available_users