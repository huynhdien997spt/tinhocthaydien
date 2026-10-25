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

### 7.2. Phân định Tính Bất biến Lô và Xử lý Xung đột Trùng lặp (True Idempotency & Collision Safety)
- Không được mặc nhiên xem mọi `Username` đã tồn tại trong bảng `USERS` là kết quả của việc nhập lại (replay) thành công một lô dữ liệu.
- Hệ thống phân biệt rõ rệt hai trạng thái hoàn toàn khác nhau:
  1. **Nhập lại lô dữ liệu hợp lệ (Genuine Batch Replay):**
     - Mỗi yêu cầu nhập theo lô phải mang định danh `batchId` (UUID client sinh) và `batchFingerprint` (chuỗi băm SHA-256 của toàn bộ payload chuẩn hóa gồm `schoolYear`, `importMode` và mảng `accounts`).
     - Khi nhận một yêu cầu có cùng `batchFingerprint` và `batchId`:
       + Hệ thống đối chiếu dữ liệu của các tài khoản đã tồn tại: nếu `Username`, `StudentUID`, `FullName`, `ClassID` và `SchoolYear` hoàn toàn trùng khớp với thông tin đã được ghi nhận trong lần thử trước đó của chính lô này, bản ghi được xác định là **Nhập lại hợp lệ (Replay)** với trạng thái `status: "replayed"`.
       + Nếu phát hiện tài khoản đã có trong `USERS` nhưng thiếu bản ghi trong `ENROLLMENTS` (do sự cố đứt quãng trước đó), hệ thống sẽ kích hoạt cơ chế tự hàn gắn (**Self-Healing**) để bổ sung `ENROLLMENTS` mà không tạo mới người dùng.
  2. **Xung đột tài khoản đã tồn tại (Existing-Account Collision):**
     - Nếu một `accountId` / `Username` đã tồn tại trong cơ sở dữ liệu nhưng:
       + Thuộc về một `batchId` hoặc `batchFingerprint` khác; HOẶC
       + Có thông tin họ tên, lớp, hoặc năm học khác biệt; HOẶC
       + Là tài khoản đã được khởi tạo từ trước phiên làm việc hiện tại.
     - **Quy tắc an toàn tuyệt đối:**
       + Hệ thống **TUYỆT ĐỐI KHÔNG ĐƯỢC gán nhãn thành công hay âm thầm bỏ qua (`skipped_existing`)** khiến giáo viên lầm tưởng tài khoản mới đã được tạo.
       + Hệ thống phải từ chối bản ghi đó với mã lỗi rõ ràng: **`COLLISION_EXISTING_ACCOUNT`** (hoặc `ACCOUNT_ALREADY_EXISTS`), chỉ rõ xung đột với tài khoản cũ.
       + Không bao giờ gộp tài khoản hay ghi đè lên tài khoản cũ dù có trùng `fullName`.
- **Thực thi trong phạm vi khóa ghi (`withLock_`):**
  - Mọi thao tác kiểm tra trùng lặp và phân quyền (`assignedSet_`) phải được thực hiện lại **bên trong khối khóa ghi `withLock_`**, loại bỏ hoàn toàn lỗ hổng tương tranh TOCTOU (Time-of-Check to Time-of-Use) khi có hai giáo viên cùng thao tác hoặc phân công lớp bị thay đổi giữa bước thẩm định và bước ghi.

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
