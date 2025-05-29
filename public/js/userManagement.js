let allUsers = [];

// // Thêm hàm kiểm tra admin vào đầu file
// function isAdmin() {
//     try {
//         const token = localStorage.getItem('adminToken');
//         if (!token) return false;

//         const payload = JSON.parse(atob(token.split('.')[1]));
//         return payload.email === 'admin@admin.com';
//     } catch (error) {
//         return false;
//     }
// }

// Sửa lại hàm switchTab
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => 
        tab.classList.remove('active')
    );
    document.querySelectorAll('.tab-button').forEach(btn => 
        btn.classList.remove('active')
    );
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`button[onclick="switchTab('${tabName}')"]`)
        .classList.add('active');
    
    if (tabName === 'users') {
        loadUsers();
    }
}

// Sửa lại hàm loadUsers
async function loadUsers() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('http://localhost:3000/api/users', {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.success) {
            allUsers = data.data;
            displayUsers(allUsers);
        } else {
            showError("Không thể tải danh sách người dùng: " + data.message);
        }
    } catch (error) {
        console.error("Lỗi:", error);
        showError("Không thể kết nối với server");
    }
}

// // Thêm hàm kiểm tra quyền admin
// function checkAdminAccess() {
//     const token = localStorage.getItem('token');
//     if (!token) {
//         window.location.href = 'login.html';
//         return false;
//     }

//     try {
//         const payload = JSON.parse(atob(token.split('.')[1]));
//         if (payload.role !== 'admin') {
//             alert('Bạn không có quyền truy cập trang này!');
//             window.location.href = 'home.html';
//             return false;
//         }
//         return true;
//     } catch (error) {
//         console.error('Lỗi kiểm tra token:', error);
//         return false;
//     }
// }

// Hiển thị danh sách người dùng
function displayUsers(users) {
    const container = document.getElementById('usersContainer');
    
    if (users.length === 0) {
        container.innerHTML = '<div class="no-users">Không có người dùng nào.</div>';
        return;
    }

    let html = `
        <table class="users-table">
            <thead>
                <tr>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
        html += `
            <tr>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td>${new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                <td class="action-buttons">
                    <button class="btn btn-edit" onclick="editUser('${user._id}')">Sửa</button>
                    <button class="btn btn-delete" onclick="deleteUser('${user._id}')">Xóa</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Sửa thông tin người dùng
function editUser(userId) {
    const user = allUsers.find(u => u._id === userId);
    if (!user) return;

    document.getElementById('editUserId').value = user._id;
    document.getElementById('editUserFullName').value = user.fullName;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPassword').value = '';

    openModal('editUserModal');
}

// Xóa người dùng
function deleteUser(userId) {
    document.getElementById('deleteUserId').value = userId;
    openModal('deleteUserModal');
}

// Xác nhận xóa người dùng
async function confirmDeleteUser() {
    const userId = document.getElementById('deleteUserId').value;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Đã xóa người dùng thành công');
            closeModal('deleteUserModal');
            loadUsers();
        } else {
            showError('Không thể xóa người dùng: ' + data.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        showError('Không thể kết nối với server');
    }
}

// Cập nhật form handler
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('editUserId').value;
        const updatedData = {
            fullName: document.getElementById('editUserFullName').value,
            email: document.getElementById('editUserEmail').value,
            password: document.getElementById('editUserPassword').value
        };

        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Không tìm thấy token admin');
            }

            const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                showMessage('Cập nhật thành công');
                closeModal('editUserModal');
                loadUsers();
            } else {
                showError(data.message || 'Không thể cập nhật thông tin');
            }
        } catch (error) {
            console.error('Lỗi:', error);
            showError('Không thể kết nối với server');
        }
    });

    document.getElementById('userRefreshBtn').addEventListener('click', loadUsers);
});