import {encodeGraph, wrapObject} from "@graffy/common";
import { log } from "debug";
test('encoding test', () => {
    const data = [
        {
            "id": "6383e3fb-280c-4633-a43d-0d6a62f69313",
            "updated_at": 1713431465075,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1713431465075,
                    "6383e3fb-280c-4633-a43d-0d6a62f69313"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "6383e3fb-280c-4633-a43d-0d6a62f69313"
            ]
        },
        {
            "id": "0a88e9cc-7901-4230-b768-9e84c7e2b813",
            "updated_at": 1713855975761,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1713855975761,
                    "0a88e9cc-7901-4230-b768-9e84c7e2b813"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "0a88e9cc-7901-4230-b768-9e84c7e2b813"
            ]
        },
        {
            "id": "0a88e9cc-7901-4230-b768-9e84c7e2b813",
            "updated_at": 1713855975761,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1713855975761,
                    "0a88e9cc-7901-4230-b768-9e84c7e2b813"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "0a88e9cc-7901-4230-b768-9e84c7e2b813"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1714029560452,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714029560452,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9",
            "updated_at": 1714465602270,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714465602270,
                    "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9"
            ]
        },
        {
            "id": "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9",
            "updated_at": 1714465602270,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714465602270,
                    "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9"
            ]
        },
        {
            "id": "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9",
            "updated_at": 1714465602270,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714465602270,
                    "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "8d5d0daf-eb45-4b1a-b9fb-3bc5a10f52b9"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "80e7f26a-8cd5-4038-9c6e-59feb159b223",
            "updated_at": 1714637705168,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1714637705168,
                    "80e7f26a-8cd5-4038-9c6e-59feb159b223"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "80e7f26a-8cd5-4038-9c6e-59feb159b223"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "744551d2-efa1-411b-8563-fd541f59d9d1",
            "updated_at": 1715238016101,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715238016101,
                    "744551d2-efa1-411b-8563-fd541f59d9d1"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "744551d2-efa1-411b-8563-fd541f59d9d1"
            ]
        },
        {
            "id": "e2b5d013-ff15-4ec2-adef-d952ba0d5d42",
            "updated_at": 1715330832555,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715330832555,
                    "e2b5d013-ff15-4ec2-adef-d952ba0d5d42"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "e2b5d013-ff15-4ec2-adef-d952ba0d5d42"
            ]
        },
        {
            "id": "e2b5d013-ff15-4ec2-adef-d952ba0d5d42",
            "updated_at": 1715330832555,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715330832555,
                    "e2b5d013-ff15-4ec2-adef-d952ba0d5d42"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "e2b5d013-ff15-4ec2-adef-d952ba0d5d42"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "51dfb225-c8de-4352-946e-bf855568417c",
            "updated_at": 1715841272537,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841272537,
                    "51dfb225-c8de-4352-946e-bf855568417c"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "51dfb225-c8de-4352-946e-bf855568417c"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "1477abb9-f112-4aa3-94b6-4d004b87161e",
            "updated_at": 1715841274079,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841274079,
                    "1477abb9-f112-4aa3-94b6-4d004b87161e"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "1477abb9-f112-4aa3-94b6-4d004b87161e"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        },
        {
            "id": "cf8bb657-9453-41eb-be60-4685aef4ab1f",
            "updated_at": 1715841277621,
            "$key": {
                "$order": [
                    "updated_at",
                    "id"
                ],
                "$cursor": [
                    1715841277621,
                    "cf8bb657-9453-41eb-be60-4685aef4ab1f"
                ],
                "tenant_id": "9e77745f-66a7-4e91-87b0-bae7a635291d",
                "updated_at": {
                    "$gt": -86400000
                }
            },
            "$ver": null,
            "$ref": [
                "person_record",
                "cf8bb657-9453-41eb-be60-4685aef4ab1f"
            ]
        }
    ];
    const wrappedObject = wrapObject(
      data,
      [
        "person_record"
      ]);
  // log('wrappedObject',wrappedObject);
  expect(wrappedObject['person_record'].length).toEqual(100);

  const finalResult = encodeGraph(wrappedObject);
  console.log(new Set(data.map(obj=>obj.updated_at)));
  expect(finalResult[0].children.length).toEqual(100);
})
