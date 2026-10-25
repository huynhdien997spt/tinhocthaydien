# ACCOUNT IMPORT SCHEMA v1.0 SPECIFICATION
## Data Contract & Validation Specification for Standardized Account Provisioning

- **Schema Identifier:** `https://tinhocthaydien.edu.vn/schemas/account-import-v1.schema.json`
- **Schema Version:** `1.0`
- **Specification Status:** `DESIGN_PROPOSAL / NOT_YET_VERIFIED (Pre-Implementation Review)`
- **Target Subsystem:** Google Apps Script Authentication & Account Management Backend
- **Repository:** `huynhdien997spt/tinhocthaydien`
- **Working Branch:** `account-management-json-review`
- **Baseline Commit:** `ecc56e274739078b431cf8fe294040a9cb6bacf5`

---

## 1. Mục đích và Ranh giới Thiết kế (Design Proposal)

Tài liệu này xác lập đặc tả định dạng dữ liệu JSON chuẩn hóa (`Account Import Schema v1.0`) dùng để nhập và khởi tạo tài khoản học sinh, giáo viên và quản trị viên cho nền tảng học tập **Tin học Thầy Diễn**. 

> [!NOTE]
> Tài liệu này là **đề xuất thiết kế (DESIGN_PROPOSAL)** cho quy trình quản lý tài khoản web-based, **chưa được triển khai vào mã nguồn production**. Mọi quy tắc và hành vi mô tả dưới đây đều ở trạng thái **NOT_YET_VERIFIED** trên môi trường thực thi Google Apps Script.

Mục tiêu chính:
1. Cung cấp một hợp đồng dữ liệu phi tập trung (decoupled contract), cho phép nhập liệu có cấu trúc từ tệp JSON thay vì giáo viên phải trực tiếp can thiệp thủ công vào Google Sheets.
2. Thiết lập ranh giới dữ liệu nghiêm ngặt giữa thuộc tính do người dùng/giáo viên khai báo (`Client-Supplied Fields`) và thuộc tính bảo mật do máy chủ sở hữu (`Server-Owned Fields`).
3. Chuẩn hóa quy tắc thẩm định (validation) độc lập trong bộ nhớ trước khi thực hiện bất kỳ thao tác ghi cơ sở dữ liệu nào.

---

## 2. Cấu trúc JSON Chuẩn (Canonical Example)

```json
{
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
  "description": "JSON Schema chuẩn hóa cho tác vụ nhập tài khoản học sinh, giáo viên và quản trị viên (DESIGN_PROPOSAL)",
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
[Máy chủ tự sinh độc lập]     ───►     PasswordHash (PBKDF2-HMAC-SHA256, 1000 vòng theo Code.gs)
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

### 7.2. Cơ chế Write-Ahead Provenance & Lưu trữ Bền vững Nguồn gốc Lô (Write-Ahead Provenance & Collision Safety)
- **Vấn đề cốt lõi:** Bảng `USERS` (18 cột) và `ENROLLMENTS` (11 cột) hiện hữu **không lưu trữ `batchId` hay `batchFingerprint`**. Do đó, nếu máy chủ ghi trực tiếp vào `USERS` trước khi có chứng cứ nguồn gốc bền vững, một sự cố gián đoạn giữa chừng sẽ tạo ra các tài khoản mồ côi mà máy chủ không thể chứng minh thuộc về lô nào. Quy trình cũ (`USERS → ENROLLMENTS → AUTH_IMPORT_BATCHES → AUTH_IMPORT_ITEMS`) bị bãi bỏ hoàn toàn.
- **Quy trình Write-Ahead Provenance (WAL):**
  Nhằm đảm bảo dữ liệu luôn có chứng cứ nguồn gốc trước khi chạm vào bảng nghiệp vụ, hệ thống bắt buộc thực hiện theo trình tự 7 bước nghiêm ngặt bên trong khóa ghi `withLock_`:
  1. **Bước 1 (Thẩm định & Cấp phát Trước UID):** Thẩm định cú pháp, kiểm tra phân quyền (`assignedSet_`), kiểm tra xung đột với `USERS`. Sinh trước danh sách `StudentUID` bất biến (`"stu_" + uuid_()`) cho 100% tài khoản trong RAM.
  2. **Bước 2 (Ghi Trước Header Lô - Trạng thái PREPARING):** Ghi một bản ghi vào bảng `AUTH_IMPORT_BATCHES` với trạng thái `Status = "PREPARING"`, `CreatedCount = 0`, `ReplayedCount = 0`, `ExpiresAt = now + 24h`.
  3. **Bước 3 (Ghi Trước Danh mục Từng Mục - Trạng thái PLANNED):** Ghi toàn bộ danh sách tài khoản dự kiến tạo vào bảng `AUTH_IMPORT_ITEMS` với `ItemStatus = "PLANNED"`, gắn chặt với `StudentUID` đã sinh trước.
  4. **Bước 4 (Ghi Bảng USERS):** Chỉ sau khi chứng cứ nguồn gốc đã tồn tại bền vững trong `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`, máy chủ mới ghi các dòng mới vào `USERS` sử dụng đúng các `StudentUID` đã cấp phát trước.
  5. **Bước 5 (Ghi Bảng ENROLLMENTS):** Ghi các dòng tương ứng vào `ENROLLMENTS` (đối với học sinh) bằng đúng các `StudentUID` đó.
  6. **Bước 6 (Đối chiếu & Cập nhật Trạng thái Mục - CREATED):** Quét đối chiếu lại `USERS`, `ENROLLMENTS` và `AUTH_IMPORT_ITEMS`. Khi xác nhận các dòng đã tồn tại nhất quán, cập nhật các mục trong `AUTH_IMPORT_ITEMS` từ `"PLANNED"` sang `"CREATED"`.
  7. **Bước 7 (Chốt Hoàn tất Lô - COMMITTED):** Chỉ chuyển trạng thái của lô trong `AUTH_IMPORT_BATCHES` từ `"PREPARING"` sang `"COMMITTED"` khi 100% tài khoản được xác minh nhất quán.

- **Định dạng Chuẩn hóa Toàn hệ thống:**
  - `batchId`: Định dạng chuỗi duy nhất: **`^bat_[0-9a-f]{32}$`** (tiền tố `bat_` kết hợp 32 ký tự hex UUID v4 không gạch nối, ví dụ: `"bat_c0a80101e5f67890123456789abcdef0"`).
  - `batchFingerprint`: Chuỗi băm SHA-256 gồm 64 ký tự hex chữ thường, được **tính toán độc quyền tại máy chủ** từ payload chuẩn hóa (ví dụ payload mẫu 4 tài khoản có băm thực tế là `"c1daae96748a1c2af1858a9db84ef2e43197839ac51e71d13198db450346992b"`). Tuyệt đối không dùng chuỗi băm rỗng `e3b0c442...`.

- **Cấu trúc 2 Bảng Metadata Nguồn gốc (`PROPOSED_CHANGE — PENDING_HUMAN_APPROVAL`):**
  1. **Bảng `AUTH_IMPORT_BATCHES` (12 cột):**
     `["BatchID", "BatchFingerprint", "OperatorUID", "OperatorRole", "SchoolYear", "ClassID", "TotalAccounts", "CreatedCount", "ReplayedCount", "Status", "CreatedAt", "ExpiresAt"]`
     - `Status`: Vòng đời trạng thái lô gồm `["PREPARING", "COMMITTED", "FAILED", "EXPIRED"]`.
  2. **Bảng `AUTH_IMPORT_ITEMS` (7 cột):**
     `["ItemID", "BatchID", "StudentUID", "AccountId", "Username", "ItemStatus", "CreatedAt"]`
     - `ItemStatus`: Vòng đời trạng thái mục gồm `["PLANNED", "CREATED", "REPLAYED"]`.
  3. **Chính sách Zero Secret Persistence trong Metadata:**
     - Tuyệt đối **KHÔNG lưu trữ mật khẩu rõ, mật khẩu tạm, password hash, password salt hay token phiên** trong `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`.

- **Chuẩn hóa JSON Chuẩn tắc (Canonical JSON Normalization):**
  - Máy chủ **bỏ qua hoàn toàn và không tin cậy giá trị hash do client gửi lên**. Giá trị băm SHA-256 bắt buộc do chính máy chủ tự tính toán:
    1. *Khóa cấp gốc:* Sắp xếp theo thứ tự bảng chữ cái: `["accounts", "importMode", "schoolYear", "schemaVersion"]`.
    2. *Khóa đối tượng tài khoản:* Sắp xếp theo thứ tự: `["accountId", "classId", "fullName", "grade", "role", "schoolLevel"]`.
    3. *Sắp xếp mảng accounts:* Các phần tử được sắp xếp theo thứ tự chữ hoa tăng dần của `accountId.toUpperCase()`.
    4. *Làm sạch chuỗi:* Mọi giá trị chuỗi văn bản được trim bỏ khoảng trắng thừa đầu và cuối.
    5. *Tuần tự hóa thu gọn:* Chuyển đổi thành chuỗi JSON không chứa khoảng trắng thừa, không xuống dòng, dấu `:` và `,` không kèm dấu cách.
    6. *Tính toán băm:* Nạp chuỗi byte UTF-8 của JSON chuẩn hóa vào SHA-256 $\rightarrow$ sinh ra chuỗi hex 64 ký tự chữ thường (`serverFingerprint`).

- **Quy tắc Phục hồi An toàn theo Từng Điểm Gián đoạn (Failure States A–F):**
  Khi client gửi lại yêu cầu nạp lô với cùng `batchId`:
  - **Trường hợp A (Đã tạo batch PREPARING nhưng chưa ghi đủ manifest):**
    + *Bằng chứng máy chủ:* `AUTH_IMPORT_BATCHES` có `batchId` ở trạng thái `"PREPARING"`, nhưng số dòng trong `AUTH_IMPORT_ITEMS` nhỏ hơn `TotalAccounts`. Bảng `USERS` chưa có tài khoản nào của lô này.
    + *Xử lý phục hồi:* Máy chủ làm sạch các dòng dở dang trong `AUTH_IMPORT_ITEMS`, ghi lại đầy đủ manifest với trạng thái `"PLANNED"` cùng các `StudentUID` sinh mới, sau đó tiếp tục quy trình Write-Ahead.
  - **Trường hợp B (Đã ghi manifest PLANNED nhưng chưa ghi USERS):**
    + *Bằng chứng máy chủ:* `AUTH_IMPORT_ITEMS` có đủ $N$ mục ở trạng thái `"PLANNED"` với các `StudentUID` đã cấp phát trước. Bảng `USERS` chưa có các tài khoản này.
    + *Xử lý phục hồi:* Sử dụng chính xác các `StudentUID` đã lưu trong `AUTH_IMPORT_ITEMS` để ghi vào `USERS` (Bước 4), sau đó tiếp tục ghi `ENROLLMENTS` (Bước 5), cập nhật items thành `"CREATED"` (Bước 6) và chốt batch `"COMMITTED"` (Bước 7). Tránh hoàn toàn việc sinh trùng `StudentUID`.
  - **Trường hợp C (Đã ghi USERS nhưng thiếu ENROLLMENTS):**
    + *Bằng chứng máy chủ:* `AUTH_IMPORT_ITEMS` ở trạng thái `"PLANNED"`, bảng `USERS` đã có tài khoản với đúng `StudentUID` từ manifest, nhưng `ENROLLMENTS` chưa có dòng tương ứng.
    + *Xử lý phục hồi:* Không ghi lại `USERS`. Máy chủ thực hiện ghi bổ sung vào `ENROLLMENTS` từ dữ liệu chuẩn của `USERS`, cập nhật items thành `"CREATED"` và chốt batch `"COMMITTED"`.
  - **Trường hợp D (Đã ghi USERS và ENROLLMENTS nhưng chưa cập nhật trạng thái mục):**
    + *Bằng chứng máy chủ:* Cả `USERS` và `ENROLLMENTS` đều đã có dữ liệu hoàn chỉnh khớp với `AUTH_IMPORT_ITEMS`, nhưng các mục trong `AUTH_IMPORT_ITEMS` vẫn đang ở trạng thái `"PLANNED"`.
    + *Xử lý phục hồi:* Máy chủ cập nhật các mục sang `"CREATED"`, sau đó chuyển batch sang `"COMMITTED"`.
  - **Trường hợp E (Đã hoàn tất các mục CREATED nhưng chưa đánh dấu batch COMMITTED):**
    + *Bằng chứng máy chủ:* 100% mục trong `AUTH_IMPORT_ITEMS` đã là `"CREATED"`, `USERS` và `ENROLLMENTS` đầy đủ, nhưng `AUTH_IMPORT_BATCHES` vẫn là `"PREPARING"`.
    + *Xử lý phục hồi:* Máy chủ cập nhật `AUTH_IMPORT_BATCHES.Status = "COMMITTED"`.
  - **Trường hợp F (Đã COMMITTED nhưng phản hồi HTTP bị thất lạc):**
    + *Bằng chứng máy chủ:* `AUTH_IMPORT_BATCHES.Status === "COMMITTED"`.
    + *Xử lý phục hồi:* Trả về kết quả Replay hợp lệ với `temporaryPassword: null` và `passwordReissueAvailable: true`. Tuyệt đối không sinh lại UID hay gửi lại mật khẩu cũ.
  - **Điều kiện Từ chối Tự động & Yêu cầu Đối chiếu Thủ công:**
    + Nếu `batchId` đã tồn tại nhưng `OperatorUID !== session.uid` $\rightarrow$ Từ chối ngay với **`BATCH_ID_TAKEN`**.
    + Nếu `serverFingerprint !== stored.BatchFingerprint` $\rightarrow$ Từ chối ngay với **`BATCH_PAYLOAD_MISMATCH`**.
    + Nếu tài khoản trong payload đã tồn tại trong `USERS` nhưng không nằm trong manifest `AUTH_IMPORT_ITEMS` của chính lô này $\rightarrow$ Từ chối ngay với **`COLLISION_EXISTING_ACCOUNT`**. Tuyệt đối không tự nhận tài khoản cũ là tài khoản thuộc lô.
    + Nếu phát hiện mâu thuẫn dữ liệu không thể tự hàn gắn (ví dụ `StudentUID` trong manifest trùng với một học sinh khác đã tồn tại từ trước) $\rightarrow$ Đánh dấu batch là `"FAILED"` và trả mã lỗi **`BATCH_CORRUPTED_MANUAL_REVIEW`**, yêu cầu quản trị viên đối chiếu thủ công.

---

### 7.3. Ánh xạ Đồng bộ vào Bảng ENROLLMENTS (Enrollment Consistency Guarantee)
Hệ thống học tập V3 và V2 Cloud Data (`backend/StudentV2.gs` và `backend/Teacher.gs`) sử dụng bảng `ENROLLMENTS` để xác định danh sách học sinh thuộc lớp.

> [!IMPORTANT]
> **Ràng buộc Kiến trúc Roster (`Teacher.gs:buildRosters_`):**
> Trong `Teacher.gs`, hàm `buildRosters_()` kiểm tra bảng `ENROLLMENTS`. Khi bảng `ENROLLMENTS` tồn tại và có dữ liệu, danh sách học sinh trong lớp được xây dựng **độc quyền từ các bản ghi có `Active = "TRUE"` trong `ENROLLMENTS`**, sau đó mới liên kết sang `USERS` qua `StudentUID`.
> Nếu một tài khoản học sinh chỉ được ghi vào bảng `USERS` mà **không có bản ghi tương ứng trong `ENROLLMENTS`**, học sinh đó sẽ trở thành **Người dùng mồ côi (Orphan User)**: không bao giờ xuất hiện trên Bảng điều khiển Giáo viên (Teacher Dashboard), không thể nhận bài tập hay theo dõi tiến độ theo lớp!

Do đó, đối với mọi tài khoản có `role = "student"`, quá trình khởi tạo tài khoản qua JSON phải tạo đồng thời bản ghi trong cả 2 bảng theo cấu trúc hiện hành:

```text
JSON Payload / USERS Record           ENROLLMENTS Sheet (V2_HEADERS.ENROLLMENTS)
───────────────────────────           ─────────────────────────────────────────
[Máy chủ tự sinh độc lập]      ───►   EnrollmentID ("enr_" + UUID không gạch nối)
StudentUID (từ USERS)          ───►   StudentUID
schoolYear (từ cấp root)       ───►   SchoolYear
schoolLevel (từ account)       ───►   SchoolLevel ("TIEUHOC", "THCS", "THPT")
grade (từ account)             ───►   Grade (1..12)
classId (từ account)           ───►   ClassID ("6A1",...)
[Cố định khi tạo mới]         ───►   Active ("TRUE")
[Ngày máy chủ YYYY-MM-DD]     ───►   StartDate
[Để trống ban đầu]            ───►   EndDate ("")
[Thời gian máy chủ UTC]        ───►   CreatedAt (ISO 8601 string)
[Thời gian máy chủ UTC]        ───►   UpdatedAt (ISO 8601 string)
```

- **Tính nhất quán đa trường:** `StudentUID`, `SchoolYear`, `ClassID`, `Grade`, và `SchoolLevel` giữa bảng `USERS` và `ENROLLMENTS` phải hoàn toàn đồng nhất.
- **Bảo tồn cấu trúc bảng:** Tuyệt đối không thay đổi cấu trúc 11 cột hiện có của bảng `ENROLLMENTS` (`V2_HEADERS.ENROLLMENTS` tại `StudentV2.gs:45`).
- **Phục hồi sự cố gián đoạn ghi (`PARTIAL_WRITE_ORPHAN`):**
  - Do Google Sheets không có cơ chế giao dịch đa bảng (multi-table transaction rollback), nếu quá trình ghi bảng `USERS` thành công nhưng bước ghi `ENROLLMENTS` gặp sự cố (timeout, mạng ngắt):
    + Trạng thái hệ thống tạm thời là `PARTIAL_WRITE_ORPHAN`.
    + Khi giáo viên thực hiện nạp lại cùng lô (Replay) hoặc qua hành động đồng bộ/kiểm tra dữ liệu, hệ thống tự động phát hiện các tài khoản `student` trong `USERS` chưa có dòng tương ứng trong `ENROLLMENTS` cho `SchoolYear` đó.
    + Hệ thống tự động tạo bản ghi `ENROLLMENTS` bổ sung từ dữ liệu chuẩn đã có trong `USERS`, khôi phục tính toàn vẹn mà không cần cấp lại UID hay đổi mật khẩu của học sinh.

---

### 7.4. Tách biệt Tuyệt đối Nhật ký Xác thực khỏi EVENT_LOG (Audit Logging Isolation)
- Bảng `EVENT_LOG` hiện hành (`V2_HEADERS.EVENT_LOG` tại `StudentV2.gs:50`) là bảng dữ liệu dành riêng cho sự kiện học tập của học sinh (`StudentUID`, `LessonID`, `ActivityID`, `EventType`, `ProcessedAt`). Hàm `timeline_()` trong `Teacher.gs` dựa trực tiếp vào `EVENT_LOG` để dựng dòng thời gian học tập (nộp bài, hoàn thành hoạt động, nộp Exit Ticket).
- **Quy tắc cách ly:** Tuyệt đối **KHÔNG ghi các sự kiện quản trị tài khoản** (tạo tài khoản, import hàng loạt, reset mật khẩu, khóa tài khoản) vào bảng `EVENT_LOG`. Việc ghi lẫn sẽ làm sai lệch cấu trúc dữ liệu học tập, gây lỗi parse `LessonID` / `ActivityID` và làm hỏng biểu đồ học tập của học sinh.
- Các sự kiện quản trị tài khoản được đề xuất ghi nhận vào một cơ chế riêng biệt mang tên `AUTH_AUDIT` (`PROPOSED_CHANGE - PENDING_HUMAN_APPROVAL`), được đặc tả chi tiết tại [account-security-review.md](file:///Users/huynhvandien/tinhocthaydien/docs/auth/account-security-review.md).
