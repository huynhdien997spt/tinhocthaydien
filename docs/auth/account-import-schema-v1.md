# ACCOUNT IMPORT SCHEMA v1.0 SPECIFICATION
## Data Contract & Validation Specification for Standardized Account Provisioning

- **Schema Identifier:** `https://tinhocthaydien.edu.vn/schemas/account-import-v1.schema.json`
- **Schema Version:** `1.0`
- **Specification Status:** `PROPOSED_DESIGN / DESIGN_REVIEW`
- **Target Subsystem:** Google Apps Script Authentication & Account Management Backend
- **Repository:** `huynhdien997spt/tinhocthaydien`
- **Working Branch:** `account-management-json-review`

---

## 1. Mục đích và Phạm vi

Tài liệu này xác lập đặc tả định dạng dữ liệu JSON chuẩn hóa (`Account Import Schema v1.0`) dùng để nhập và khởi tạo tài khoản học sinh, giáo viên và quản trị viên cho nền tảng học tập **Tin học cùng Thầy Diễn**. 

Mục tiêu chính:
1. Cung cấp một hợp đồng dữ liệu phi tập trung (decoupled contract), cho phép nhập liệu có cấu trúc từ tệp JSON thay vì giáo viên phải trực tiếp can thiệp thủ công vào Google Sheets.
2. Thiết lập ranh giới dữ liệu nghiêm ngặt giữa thuộc tính do người dùng/giáo viên khai báo (`Client-Supplied Fields`) và thuộc tính bảo mật do máy chủ sở hữu (`Server-Owned Fields`).
3. Chuẩn hóa quy tắc thẩm định (validation) độc lập trước khi thực hiện bất kỳ thao tác ghi cơ sở dữ liệu nào.

---

## 2. Cấu trúc JSON Chuẩn (Canonical Example)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "schemaVersion": "1.0",
  "schoolYear": "2026-2027",
  "importMode": "create_only",
  "accounts": [
    {
      "accountId": "6A1-01",
      "fullName": "Nguyễn Văn An",
      "classId": "6A1",
      "grade": 6,
      "schoolLevel": "THCS",
      "role": "student"
    },
    {
      "accountId": "6A1-02",
      "fullName": "Trần Thị Bình",
      "classId": "6A1",
      "grade": 6,
      "schoolLevel": "THCS",
      "role": "student"
    },
    {
      "accountId": "GV-001",
      "fullName": "Huỳnh Văn Diễn",
      "classId": "",
      "grade": null,
      "schoolLevel": "",
      "role": "teacher"
    },
    {
      "accountId": "AD-001",
      "fullName": "Quản Trị Viên Hệ Thống",
      "classId": "",
      "grade": null,
      "schoolLevel": "",
      "role": "admin"
    }
  ]
}
```

---

## 3. Đặc tả Chi tiết các Trường Dữ liệu (Field Specifications)

### 3.1. Các trường cấp gốc (Root-level Fields)

| Tên trường | Kiểu dữ liệu | Bắt buộc | Giá trị cho phép / Định dạng | Mô tả nghiệp vụ |
|---|---|---|---|---|
| `schemaVersion` | `string` | **Có** | `"1.0"` | Phiên bản hợp đồng dữ liệu. Chỉ chấp nhận `"1.0"`. |
| `schoolYear` | `string` | **Có** | `^[0-9]{4}-[0-9]{4}$` (ví dụ `"2026-2027"`) | Năm học áp dụng. Hai năm phải liên tiếp nhau ($Y_2 = Y_1 + 1$). |
| `importMode` | `string` | **Có** | `"create_only"` | Chế độ nhập. v1.0 chỉ hỗ trợ tạo mới, không cho phép ghi đè hay cập nhật. |
| `accounts` | `array` | **Có** | Mảng chứa từ 1 đến 100 đối tượng tài khoản | Danh sách các tài khoản cần khởi tạo trong phiên làm việc. |

### 3.2. Thuộc tính từng tài khoản (`accounts[*]`)

| Tên trường | Kiểu dữ liệu | Bắt buộc đối với Student | Bắt buộc đối với Teacher/Admin | Ràng buộc kỹ thuật |
|---|---|---|---|---|
| `accountId` | `string` | **Có** | **Có** | Độ dài 3–60 ký tự; regex: `^[A-Za-z0-9._-]{3,60}$`; không chứa khoảng trắng; không trùng lặp (không phân biệt hoa thường) trong tệp và trong hệ thống. |
| `fullName` | `string` | **Có** | **Có** | Độ dài 2–100 ký tự; họ và tên tiếng Việt hợp lệ; đã được trim khoảng trắng thừa; không chứa ký tự điều khiển hoặc ký tự bắt đầu công thức (`=`, `+`, `-`, `@`). |
| `role` | `string` | **Có** | **Có** | Enum: `["student", "teacher", "admin"]`. |
| `classId` | `string` | **Có** | Không (để trống `""`) | Học sinh: regex `^[A-Za-z0-9._-]{1,30}$` (ví dụ `"6A1"`, `"9A2"`). Giáo viên/Admin: chuỗi rỗng `""`. |
| `grade` | `integer` / `null` | **Có** | Không (phải là `null`) | Học sinh: số nguyên từ `1` đến `12`. Giáo viên/Admin: giá trị `null`. |
| `schoolLevel` | `string` | **Có** | Không (để trống `""`) | Học sinh: enum `["TIEUHOC", "THCS", "THPT"]`. Giáo viên/Admin: chuỗi rỗng `""`. |

---

## 4. Bảng Quy tắc Tương thích Khối lớp và Cấp học (Grade vs SchoolLevel Matrix)

Đối với tài khoản vai trò `student`, trường `grade` và `schoolLevel` phải hoàn toàn tương thích theo bảng ánh xạ giáo dục phổ thông hiện hành:

| Cấp học (`schoolLevel`) | Khối lớp hợp lệ (`grade`) | Mô tả giáo dục |
|---|---|---|
| `TIEUHOC` | `1`, `2`, `3`, `4`, `5` | Khối Tiểu học |
| `THCS` | `6`, `7`, `8`, `9` | Khối Trung học cơ sở (Khối 6 thuộc cấp THCS) |
| `THPT` | `10`, `11`, `12` | Khối Trung học phổ thông |

> [!CAUTION]
> Bất kỳ bản ghi học sinh nào có sự mâu thuẫn giữa `grade` và `schoolLevel` (ví dụ: `grade = 6` kết hợp `schoolLevel = "TIEUHOC"`, hoặc `grade = 10` kết hợp `schoolLevel = "THCS"`) đều bị hệ thống phát hiện và gắn cờ lỗi `GRADE_LEVEL_MISMATCH` ngay trong giai đoạn tiền thẩm định (pre-validation).

---

## 5. Danh sách các Trường Bị Cấm Tuyệt đối (Server-Owned / Forbidden Fields)

Nhằm bảo đảm nguyên tắc **Zero Trust Client** và an toàn cấu trúc cơ sở dữ liệu `USERS` / `SESSIONS`, các trường sau **tuyệt đối không được xuất hiện** trong nội dung JSON do client gửi lên:

1. `StudentUID` (Định danh bất biến khóa chính hệ thống)
2. `TeacherUID` (Định danh nội bộ giáo viên)
3. `PasswordHash` (Mã băm mật khẩu PBKDF2)
4. `PasswordSalt` (Muối ngẫu nhiên mã hóa)
5. `TemporaryPassword` (Mật khẩu tạm phát sinh)
6. `MustChangePassword` (Cờ bắt buộc đổi mật khẩu)
7. `SessionID` (Định danh phiên làm việc)
8. `SessionToken` (Khóa xác thực người dùng)
9. `SessionTokenHash` (Băm HMAC của mã phiên)
10. `FailedAttempts` (Số lần đăng nhập sai)
11. `LockedUntil` (Thời điểm tài khoản bị khóa tạm)
12. `CreatedAt` (Dấu thời gian khởi tạo)
13. `UpdatedAt` (Dấu thời gian cập nhật)
14. `Active` (Trạng thái hiệu lực tài khoản)
15. `Revoked` (Trạng thái thu hồi phiên)
16. `DeviceInfo` (Thông tin thiết bị client)

> [!IMPORTANT]
> - Nếu bất kỳ thuộc tính nào trong danh sách trên xuất hiện ở cấp gốc hoặc trong từng đối tượng tài khoản, bộ giải mã parser phải từ chối toàn bộ gói dữ liệu với mã lỗi `FORBIDDEN_FIELD_INJECTED`.
> - Thiết lập `additionalProperties: false` ở cả cấp gốc và cấp phần tử trong JSON Schema để ngăn chặn mọi kỹ thuật chèn thêm thuộc tính ngoài đặc tả (field smuggling).

---

## 6. Định dạng JSON Schema v1.0 (Draft 2020-12)

Dưới đây là định nghĩa JSON Schema chính thức cho `Account Import Schema v1.0`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://tinhocthaydien.edu.vn/schemas/account-import-v1.schema.json",
  "title": "AccountImportSchemaV1",
  "description": "JSON Schema chuẩn hóa cho tác vụ nhập tài khoản học sinh, giáo viên và quản trị viên",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "schoolYear",
    "importMode",
    "accounts"
  ],
  "properties": {
    "schemaVersion": {
      "type": "string",
      "const": "1.0"
    },
    "schoolYear": {
      "type": "string",
      "pattern": "^(20\\d{2})-(20\\d{2})$"
    },
    "importMode": {
      "type": "string",
      "const": "create_only"
    },
    "accounts": {
      "type": "array",
      "minItems": 1,
      "maxItems": 100,
      "items": {
        "$ref": "#/$defs/accountRecord"
      }
    }
  },
  "$defs": {
    "accountRecord": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "accountId",
        "fullName",
        "role"
      ],
      "properties": {
        "accountId": {
          "type": "string",
          "pattern": "^[A-Za-z0-9._-]{3,60}$"
        },
        "fullName": {
          "type": "string",
          "minLength": 2,
          "maxLength": 100
        },
        "role": {
          "type": "string",
          "enum": [
            "student",
            "teacher",
            "admin"
          ]
        },
        "classId": {
          "type": "string",
          "maxLength": 30
        },
        "grade": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 1,
          "maximum": 12
        },
        "schoolLevel": {
          "type": "string",
          "enum": [
            "TIEUHOC",
            "THCS",
            "THPT",
            ""
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "properties": {
              "role": {
                "const": "student"
              }
            }
          },
          "then": {
            "required": [
              "classId",
              "grade",
              "schoolLevel"
            ],
            "properties": {
              "classId": {
                "minLength": 1,
                "pattern": "^[A-Za-z0-9._-]{1,30}$"
              },
              "grade": {
                "type": "integer"
              },
              "schoolLevel": {
                "enum": [
                  "TIEUHOC",
                  "THCS",
                  "THPT"
                ]
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "schoolLevel": {
                "const": "TIEUHOC"
              }
            }
          },
          "then": {
            "properties": {
              "grade": {
                "minimum": 1,
                "maximum": 5
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "schoolLevel": {
                "const": "THCS"
              }
            }
          },
          "then": {
            "properties": {
              "grade": {
                "minimum": 6,
                "maximum": 9
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "schoolLevel": {
                "const": "THPT"
              }
            }
          },
          "then": {
            "properties": {
              "grade": {
                "minimum": 10,
                "maximum": 12
              }
            }
          }
        },
        {
          "if": {
            "properties": {
              "role": {
                "enum": [
                  "teacher",
                  "admin"
                ]
              }
            }
          },
          "then": {
            "properties": {
              "classId": {
                "const": ""
              },
              "grade": {
                "type": "null"
              },
              "schoolLevel": {
                "const": ""
              }
            }
          }
        }
      ]
    }
  }
}
```

---

## 7. Quy tắc Ánh xạ Định danh vào Bảng USERS (Internal Mapping)

Khi một bản ghi trong JSON được thẩm định thành công và đưa vào tạo lập:

```text
JSON Payload (Client)                 USERS Sheet (Server Storage)
─────────────────────                 ────────────────────────────
accountId                    ───►     StudentID
accountId                    ───►     Username
fullName                     ───►     FullName
classId                      ───►     ClassID
grade                        ───►     Grade
schoolLevel                  ───►     SchoolLevel
schoolYear (cấp root)        ───►     SchoolYear
role                         ───►     Role

[Máy chủ tự sinh độc lập]     ───►     StudentUID ("stu_" + UUID không gạch nối)
[Máy chủ tự sinh độc lập]     ───►     TeacherUID ("tch_" + UUID, nếu role != student; ngược lại rỗng "")
[Máy chủ tự sinh độc lập]     ───►     PasswordHash (PBKDF2-HMAC-SHA256, 1000 vòng)
[Máy chủ tự sinh độc lập]     ───►     PasswordSalt (16 bytes random base64)
[Cố định khi tạo mới]        ───►     Active ("TRUE")
[Cố định khi tạo mới]        ───►     FailedAttempts (0)
[Cố định khi tạo mới]        ───►     LockedUntil ("")
[Cố định khi tạo mới]        ───►     MustChangePassword ("TRUE")
[Thời gian máy chủ UTC]       ───►     CreatedAt (ISO 8601 string)
[Thời gian máy chủ UTC]       ───►     UpdatedAt (ISO 8601 string)
```

### 7.1. Đảm bảo tính bất biến của khóa chính dữ liệu học tập
- Mọi quan hệ trong các sheet học tập (`PROGRESS`, `RESPONSES`, `EXIT_TICKETS`, `LEARNING_SESSIONS`, `EVENT_LOG`) **chỉ liên kết thông qua `StudentUID`**.
- `Username` và `StudentID` hoàn toàn có thể được điều chỉnh hiển thị trong tương lai mà không gây mồ côi hay phá vỡ tính liên tục của dữ liệu học tập.
- Tuyệt đối không cho phép client tự sinh hoặc tái sử dụng bất kỳ chuỗi `StudentUID` nào.

### 7.2. Kiểm tra trùng lặp tài khoản (Collision Policy)
- So khớp trường `Username` trên bảng `USERS` theo phương pháp so sánh chữ hoa: `String(existing.Username).toUpperCase() === String(candidate.accountId).toUpperCase()`.
- Nếu phát hiện trùng lặp:
  - Báo lỗi `ACCOUNT_ALREADY_EXISTS`.
  - Giữ nguyên toàn bộ bản ghi cũ trong cơ sở dữ liệu (không xóa, không sửa, không đổi mật khẩu của bản ghi cũ).
  - Không cho phép gộp tài khoản dù có cùng `fullName`.
