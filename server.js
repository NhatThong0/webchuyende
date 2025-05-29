const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Thêm SECRET_KEY
const SECRET_KEY = "your-secret-key-here"; // Thay thế bằng một chuỗi phức tạp hơn trong thực tế

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// API Routes

// Thêm middleware checkAdminAuth
const checkAdminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực'
      });
    }

    const decoded = jwt.verify(token, SECRET_KEY);

    // Kiểm tra quyền admin
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ admin mới có quyền truy cập'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }
};

// Áp dụng middleware cho các route quản lý users
app.get("/api/users", checkAdminAuth, async (req, res) => {
  try {
    const db = await connectDB();
    const users = db.collection("users");

    // Loại bỏ admin account khỏi danh sách
    const userList = await users.find({
      email: { $ne: "admin@gmail.com" }
    }, {
      projection: { password: 0 }
    }).toArray();

    res.status(200).json({
      success: true,
      data: userList
    });
  } catch (err) {
    console.error("Lỗi:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
  }
});

// Static files - đặt sau các API routes
app.use(express.static("public")); // Thư mục public phục vụ static files (HTML, CSS, JS)

// ✅ Trả về trang home.html khi truy cập root "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html")); // ← Đảm bảo home.html nằm trong public/
});

// MongoDB
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const mongoURI =
  "mongodb+srv://nhatthong:j6EECGEiJc222oLo@nhatthong.jrdblvv.mongodb.net/hairSalonBooking?retryWrites=true&w=majority&appName=nhatthong";

const client = new MongoClient(mongoURI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectDB() {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log("✅ Đã kết nối MongoDB Atlas");
    }
    return client.db("hairSalonBooking");
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB Atlas:", err);
    process.exit(1);
  }
}


app.post("/api/bookings", async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = db.collection("bookings");

    const { fullName, phone, email, date, time, notes } = req.body;

    // Tạo bản ghi trước, để MongoDB tạo _id
    const initialData = {
      fullName,
      phone,
      email,
      date,
      time,
      notes,
      status: "", // Trạng thái ban đầu
      confirmationLink: "", // tạm để trống
      cancelBooking: "", // tạm để trống
      createdAt: new Date(),
    };

    const result = await bookings.insertOne(initialData);
    const insertedId = result.insertedId.toString();

    // Encode dữ liệu để đưa vào link
    const ngayFormatted = encodeURIComponent(date);
    const gioFormatted = encodeURIComponent(time);
    const tenEncoded = encodeURIComponent(fullName);
    const idEncoded = encodeURIComponent(insertedId);

    // Tạo confirmationLink có _id
    const confirmationLink = `https://huuthinh.tail017e4c.ts.net/webhook/xacnhanlink/?id=${idEncoded}&ngay=${ngayFormatted}&gio=${gioFormatted}&ten=${tenEncoded}`;

    // Cập nhật lại bản ghi với link đầy đủ
    await bookings.updateOne(
      { _id: result.insertedId },
      { $set: { confirmationLink } }
    );

    res.status(201).json({
      success: true,
      message: "Đặt lịch thành công",
      bookingId: insertedId,
      confirmationLink
    });
  } catch (err) {
    console.error("Lỗi tạo đặt lịch:", err);
    res.status(500).json({ success: false, message: "Lỗi tạo đặt lịch" });
  }
});



// Lấy tất cả lịch
app.get("/api/bookings", async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = db.collection("bookings");

    const data = await bookings.find({}).sort({ date: -1, time: 1 }).toArray();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Lỗi lấy danh sách:", err);
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách" });
  }
});

// Lấy theo ID
app.get("/api/bookings/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = db.collection("bookings");

    const booking = await bookings.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy" });

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.error("Lỗi lấy theo ID:", err);
    res.status(500).json({ success: false, message: "Lỗi lấy chi tiết" });
  }
});

// Hủy đặt lịch
app.put("/api/bookings/:id/cancel", async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = db.collection("bookings");

    const result = await bookings.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: "cancelled" } }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch" });
    }

    res.status(200).json({ success: true, message: "Đã hủy lịch" });
  } catch (err) {
    console.error("Lỗi hủy:", err);
    res.status(500).json({ success: false, message: "Lỗi khi hủy lịch" });
  }
});

// Cập nhật trạng thái
app.put("/api/bookings/:id/status", async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = db.collection("bookings");

    const { status } = req.body;
    if (!["confirmed", "cancelled", "completed"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const result = await bookings.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch" });
    }

    res.status(200).json({ success: true, message: "Đã cập nhật trạng thái" });
  } catch (err) {
    console.error("Lỗi cập nhật trạng thái:", err);
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật" });
  }
});

// Cập nhật toàn bộ thông tin lịch
app.put("/api/bookings/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const booking = await db.collection("bookings").findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          ...req.body,
          updatedAt: new Date() // Thêm thời gian cập nhật
        }
      },
      { returnDocument: 'after' }
    );

    if (!booking.value) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch" });
    }

    res.status(200).json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ success: false, message: "Lỗi cập nhật" });
  }
});

// Xóa lịch
app.delete("/api/bookings/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = db.collection("bookings");

    const result = await bookings.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch" });
    }

    res.status(200).json({ success: true, message: "Đã xóa lịch" });
  } catch (err) {
    console.error("Lỗi xóa:", err);
    res.status(500).json({ success: false, message: "Lỗi xóa" });
  }
});

// Thống kê
app.get("/api/bookings/stats/count", async (req, res) => {
  try {
    const db = await connectDB();
    const bookings = db.collection("bookings");

    const stats = await bookings
      .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();

    const result = { total: 0, confirmed: 0, cancelled: 0, completed: 0 };
    stats.forEach((stat) => {
      if (stat._id) {
        result[stat._id] = stat.count;
        result.total += stat.count;
      }
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Lỗi thống kê:", err);
    res.status(500).json({ success: false, message: "Lỗi thống kê" });
  }
});

// Đăng ký tài khoản
app.post("/api/register", async (req, res) => {
  try {
    const db = await connectDB();
    const users = db.collection("users");

    const { fullName, email, password } = req.body;

    // Validate dữ liệu
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin"
      });
    }

    // Kiểm tra email tồn tại
    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email đã được đăng ký"
      });
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    await users.insertOne({
      fullName,
      email,
      password: hashedPassword,
      role: "user",
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công"
    });
  } catch (err) {
    console.error("Lỗi đăng ký:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
  }
});

// Cập nhật route đăng nhập
app.post("/api/login", async (req, res) => {
  try {
    const db = await connectDB();
    const users = db.collection("users");

    const { email, password } = req.body;

    // Kiểm tra email và password có được gửi không
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu"
      });
    }

    // Kiểm tra tài khoản admin đặc biệt
    if (email === "admin@admin.com" && password === "123") {
      const token = jwt.sign(
        {
          userId: "admin",
          email: email,
          role: "admin",
          fullName: "Admin"
        },
        SECRET_KEY,
        { expiresIn: "1h" }
      );

      return res.json({
        success: true,
        message: "Đăng nhập admin thành công",
        token
      });
    }

    // Tìm user theo email
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email chưa được đăng ký"
      });
    }

    // Kiểm tra mật khẩu
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Sai mật khẩu"
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role || "user",
        fullName: user.fullName
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      token
    });

  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng nhập"
    });
  }
});

// Thay thế route /api/admin/login hiện tại
app.post("/api/admin/login", async (req, res) => {
  try {
    const db = await connectDB();
    const users = db.collection("users");
    const { email, password } = req.body;

    // Tìm user admin
    const admin = await users.findOne({
      email: email,
      isAdmin: true
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản admin không tồn tại"
      });
    }

    // Kiểm tra mật khẩu
    const validPassword = await bcrypt.hash(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Sai mật khẩu"
      });
    }

    // Tạo token với quyền admin
    const token = jwt.sign(
      {
        userId: admin._id,
        email: admin.email,
        role: "admin",
        fullName: admin.fullName,
        isAdmin: true
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Đăng nhập admin thành công",
      token
    });

  } catch (error) {
    console.error("Lỗi đăng nhập admin:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server"
    });
  }
});

// Thêm hàm initializeAdmin sau phần kết nối MongoDB
async function initializeAdmin() {
  try {
    const db = await connectDB();
    const users = db.collection("users");

    // Kiểm tra xem tài khoản admin đã tồn tại chưa
    const adminExists = await users.findOne({ email: "admin@admin.com" });
    if (!adminExists) {
      // Hash mật khẩu admin
      const hashedPassword = await bcrypt.hash("123", 10);

      // Tạo tài khoản admin
      await users.insertOne({
        fullName: "Administrator",
        email: "admin@admin.com",
        password: hashedPassword,
        role: "admin",
        createdAt: new Date(),
        isAdmin: true // Thêm flag đánh dấu là admin
      });
      console.log("✅ Đã tạo tài khoản admin thành công");
    }
  } catch (error) {
    console.error("❌ Lỗi khởi tạo admin:", error);
  }
}


// Gọi hàm khởi tạo admin khi server start
app.listen(port, async () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
  await initializeAdmin();
});

// nhatthong432
//  mk mongodb cld : XbYGyh6TXNxzEPfs
