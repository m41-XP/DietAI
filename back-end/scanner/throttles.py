from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class ScanAnonRateThrottle(AnonRateThrottle):
    scope = 'scan_anon'


class ScanUserRateThrottle(UserRateThrottle):
    scope = 'scan_user'
