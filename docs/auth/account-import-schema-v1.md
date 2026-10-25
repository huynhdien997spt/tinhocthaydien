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

### 7.2. Lưu trữ Bền vững Nguồn gốc Lô và Xử lý Xung đột Trùng lặp (Durable Batch Provenance & Collision Safety)
- **Vấn đề cốt lõi:** Bảng `USERS` (18 cột) và `ENROLLMENTS` (11 cột) hiện hữu **không lưu trữ `batchId` hay `batchFingerprint`**. Do đó, nếu chỉ dựa vào tham số do client gửi lên mà không có dữ liệu đối chiếu bền vững trên máy chủ, hệ thống không thể xác minh một tài khoản có thực sự thuộc về lô nạp trước đó hay không.
- **Cơ chế Lưu trữ Bền vững Nguồn gốc Lô (Durable Batch Provenance):**
  Hệ thống đề xuất cơ chế lưu trữ mối quan hệ giữa phiên nạp, người thực hiện, dấu vân tay dữ liệu và danh sách định danh học sinh đã tạo thông qua 2 bảng độc lập (`PROPOSED_CHANGE — PENDING_HUMAN_APPROVAL`):
  1. **Bảng `AUTH_IMPORT_BATCHES` (Metadata cấp lô):**
     `["BatchID", "BatchFingerprint", "OperatorUID", "OperatorRole", "SchoolYear", "ClassID", "TotalAccounts", "CreatedCount", "ReplayedCount", "Status", "CreatedAt", "ExpiresAt"]`
     - `BatchID`: Chuỗi định danh lô do client sinh (`"bat_" + uuid_v4`).
     - `BatchFingerprint`: Chuỗi băm 64 ký tự hex SHA-256 được **tính toán độc quyền tại máy chủ**.
     - `OperatorUID`: Định danh nội bộ của giáo viên hoặc quản trị viên thực hiện lệnh nạp.
     - `OperatorRole`: Vai trò của người thực hiện (`"teacher"` hoặc `"admin"`).
     - `SchoolYear`: Năm học áp dụng.
     - `ClassID`: Lớp học liên quan (hoặc chuỗi rỗng nếu nạp đa lớp).
     - `TotalAccounts`, `CreatedCount`, `ReplayedCount`: Các chỉ số đếm số lượng tài khoản.
     - `Status`: Trạng thái lô (`"COMMITTED"`, `"PARTIAL"`).
     - `CreatedAt`: Dấu thời gian khởi tạo ISO 8601 UTC.
     - `ExpiresAt`: Thời điểm hết hạn phục hồi khẩn cấp (mặc định: `CreatedAt + 24 hours`).
  2. **Bảng `AUTH_IMPORT_ITEMS` (Chi tiết từng tài khoản trong lô):**
     `["ItemID", "BatchID", "StudentUID", "AccountId", "Username", "ItemStatus", "CreatedAt"]`
     - `ItemID`: Chuỗi định danh mục (`"itm_" + uuid_()`).
     - `BatchID`: Khóa ngoại liên kết với `AUTH_IMPORT_BATCHES.BatchID`.
     - `StudentUID`: Khóa chính bất biến của học sinh đã được tạo trong bảng `USERS`.
     - `AccountId` & `Username`: Mã định danh học sinh trong tệp.
     - `ItemStatus`: Trạng thái xử lý (`"CREATED"`, `"REPLAYED"`).
     - `CreatedAt`: Dấu thời gian tạo ISO 8601 UTC.
  3. **Chính sách Zero Secret Persistence trong Metadata:**
     - Tuyệt đối **KHÔNG lưu trữ mật khẩu rõ, mật khẩu tạm, password hash, password salt hay token phiên** trong `AUTH_IMPORT_BATCHES` và `AUTH_IMPORT_ITEMS`.

- **Chuẩn hóa JSON Chuẩn tắc (Canonical JSON Normalization) và Tính Băm SHA-256:**
  - Máy chủ **tuyệt đối không tin cậy hay sử dụng giá trị hash do client gửi lên**. Giá trị băm SHA-256 bắt buộc phải do chính máy chủ tự tính toán từ payload sau khi chuẩn hóa chuẩn tắc:
    1. *Sắp xếp khóa cấp gốc (Root Keys):* Sắp xếp theo thứ tự bảng chữ cái: `["accounts", "importMode", "schoolYear", "schemaVersion"]`.
    2. *Sắp xếp khóa đối tượng tài khoản (Account Object Keys):* Sắp xếp theo thứ tự: `["accountId", "classId", "fullName", "grade", "role", "schoolLevel"]`.
    3. *Sắp xếp danh sách tài khoản (Deterministic Sorting):* Các phần tử trong mảng `accounts` được sắp xếp theo thứ tự chữ hoa tăng dần của `accountId.toUpperCase()` để bảo đảm tính tất định (không phụ thuộc thứ tự dòng trong file).
    4. *Làm sạch chuỗi (String Trimming):* Mọi giá trị chuỗi văn bản được trim bỏ khoảng trắng thừa đầu và cuối.
    5. *Tuần tự hóa thu gọn (Compact Serialization):* Chuyển đổi thành chuỗi JSON không chứa khoảng trắng thừa, không xuống dòng, dấu `:` và `,` không kèm dấu cách.
    6. *Tính toán băm SHA-256:* Chuỗi byte UTF-8 của JSON chuẩn hóa được nạp vào hàm băm SHA-256 của máy chủ $\rightarrow$ Cho ra chuỗi hex 64 ký tự chữ thường (`serverFingerprint`).

- **Phân định Replay Hợp lệ vs Giả mạo BatchId (Anti-Spoofing & True Idempotency):**
  1. Khi nhận một yêu cầu nạp lô với `batchId`:
     - Máy chủ tra cứu `AUTH_IMPORT_BATCHES` theo `batchId`:
       + **Nếu `batchId` đã tồn tại:**
         * *Kiểm tra chủ sở hữu:* Nếu `OperatorUID !== session.uid` (và không phải admin), hệ thống **từ chối ngay lập tức** với mã lỗi **`BATCH_ID_TAKEN`**, ngăn chặn kẻ xấu giả mạo hoặc chiếm đoạt `batchId` của giáo viên khác.
         * *Kiểm tra tính toàn vẹn payload:* Nếu `serverFingerprint !== stored.BatchFingerprint`, hệ thống **từ chối ngay lập tức** với mã lỗi **`BATCH_PAYLOAD_MISMATCH`**, phát hiện hành vi thay đổi payload dưới một `batchId` cũ.
         * *Xác nhận Genuine Batch Replay:* Nếu cả `OperatorUID` và `BatchFingerprint` đều trùng khớp: Hệ thống tra cứu `AUTH_IMPORT_ITEMS` để lấy danh sách `StudentUID` thực tế đã tạo từ lô này, trả về trạng thái `replayed`. Nếu phát hiện bản ghi `ENROLLMENTS` bị thiếu ở bước trước, kích hoạt cơ chế tự hàn gắn (`status: "replayed_and_healed"`).
       + **Nếu `batchId` chưa tồn tại:**
         * Đây là một lô nạp mới. Máy chủ kiểm tra xung đột từng tài khoản đối với toàn bộ cơ sở dữ liệu `USERS`.
         * Nếu `Username` đã tồn tại trong `USERS` nhưng không thuộc lô nạp hợp lệ: **Bắt buộc từ chối bản ghi đó** với mã lỗi **`COLLISION_EXISTING_ACCOUNT`**. Tuyệt đối không cho phép tệp mới nhận nhầm tài khoản cũ là vừa tạo.
- **Thực thi trong phạm vi khóa ghi (`withLock_`):**
  - Mọi thao tác kiểm tra nguồn gốc lô, kiểm tra xung đột tài khoản, và phân quyền (`assignedSet_`) phải được thực hiện lại **bên trong khối khóa ghi `withLock_`**, loại bỏ rủi ro tương tranh TOCTOU khi có nhiều tiến trình chạy song song.

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
