from datetime import datetime, timedelta

def partition(start,end,interval):

    step = timedelta(minutes=interval)
    it =start
    result = []
    while it<end:
        result+=[it]
        it+=step

    return result


def calculate_overlaps(availabilities, interval_minutes=15):
    heatmap = {}

    for avaliability in availabilities:
        blocks = partition(avaliability.start_time, avaliability.end_time, interval_minutes)

        for block in blocks:
            if block in heatmap:
                heatmap[block] += 1
            else:
                heatmap[block] = 1
    return heatmap