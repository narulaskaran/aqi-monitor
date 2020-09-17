import AirQualityIndex

if __name__ == "__main__":
    AQI = AirQualityIndex.AirQualityIndex()
    print(AQI.get_latets_aqi())
    AQI.update()
    print(AQI.get_latets_aqi())