document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Load thông tin cá nhân
    loadUserProfile(payload);
    
    // Load lịch đặt của user
    loadUserBookings(payload);
});

async function loadUserProfile(payload) {
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    
    nameInput.value = payload.fullName;
    emailInput.value = payload.email;
    emailInput.disabled = true; // Không cho phép thay đổi email
}

async function loadUserBookings(payload) {
    try {
        const response = await fetch('http://localhost:3000/api/bookings');
        const data = await response.json();
        
        if (data.success) {
            // Lọc booking theo email của user đang đăng nhập
            const userBookings = data.data.filter(booking => 
                booking.email === payload.email
            );
            
            displayBookings(userBookings);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Không thể tải dữ liệu đặt lịch');
    }
}

function displayBookings(bookings) {
    const tbody = document.querySelector('.booking-table tbody');
    tbody.innerHTML = '';

    bookings.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.fullName}</td>
            <td>${formatDate(booking.date)}</td>
            <td>${booking.time}</td>
            <td>1 giờ</td>
            <td>
                ${getBookingActions(booking)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getBookingActions(booking) {
    if (booking.status === 'cancelled') {
        return '<span class="status-cancelled">Đã hủy</span>';
    } else if (booking.status === 'confirmed') {
        return '<span class="status-confirmed">Đã xác nhận</span>';
    } else {
        return `
            <a href="${booking.confirmationLink}" class="action-btn confirm">Xác nhận</a>
            <button onclick="cancelBooking('${booking._id}')" class="action-btn cancel">Hủy</button>
        `;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

async function cancelBooking(bookingId) {
    if (!confirm('Bạn có chắc muốn hủy lịch này?')) return;

    try {
        const response = await fetch(`http://localhost:3000/api/bookings/${bookingId}/cancel`, {
            method: 'PUT'
        });
        const data = await response.json();

        if (data.success) {
            alert('Đã hủy lịch thành công');
            location.reload();
        } else {
            alert(data.message || 'Không thể hủy lịch');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        alert('Đã xảy ra lỗi khi hủy lịch');
    }
}