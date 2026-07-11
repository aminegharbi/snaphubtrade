"""
DataFactory.py — Robot Framework library for generating unique, realistic
test data (emails, VINs, phone numbers, passwords) so parallel test runs
never collide on unique constraints (email, VIN, affiliate_code, slug...).
"""
import random
import string
import time
from robot.api.deco import keyword, library
from faker import Faker

fake = Faker()


@library(scope="GLOBAL")
class DataFactory:

    def _unique_suffix(self):
        # timestamp + short random tail — unique enough across parallel runs
        # without needing a shared counter/lock.
        return f"{int(time.time() * 1000)}{random.randint(100, 999)}"

    @keyword("Generate Test Email")
    def generate_test_email(self, prefix="qa"):
        return f"{prefix}.{self._unique_suffix()}@dubaiauto-test.invalid"

    @keyword("Generate Strong Password")
    def generate_strong_password(self):
        # Guaranteed to satisfy the backend policy: upper + lower + digit, 8-72 chars.
        return f"Qa{self._unique_suffix()}Test!"

    @keyword("Generate Full Name")
    def generate_full_name(self):
        return fake.name()

    @keyword("Generate Phone Number")
    def generate_phone_number(self):
        return f"+9715{random.randint(10000000, 99999999)}"

    @keyword("Generate VIN")
    def generate_vin(self):
        # 17 chars, alphanumeric, excludes I/O/Q per the real VIN charset —
        # matches the backend's VIN regex (11-17 chars, [A-HJ-NPR-Z0-9]).
        charset = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
        return "".join(random.choice(charset) for _ in range(17))

    @keyword("Generate Company Name")
    def generate_company_name(self):
        return f"{fake.company()} Motors {self._unique_suffix()[-4:]}"

    @keyword("Generate Affiliate Handle")
    def generate_affiliate_handle(self):
        return f"QA-{self._unique_suffix()}"
