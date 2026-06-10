## [ชื่อ API เช่น: Get User Profile]

**Description:** [อธิบายสั้นๆ ว่า API นี้ทำหน้าที่อะไร]

**Endpoint:** `[METHOD]` `[URL_PATH]`

**Authentication:** - [ ] Required (ระบุประเภท เช่น Bearer Token)
- [ ] None

---

### Request

**Headers:**
| Key | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <token>` | [ถ้ามี] |

**Path Parameters:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | [ถ้ามี] |

**Query Parameters:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | `integer`| No | [ถ้ามี] |

**Body (JSON):**
```json
{
  // ใส่ตัวอย่าง Request Body ที่นี่
}