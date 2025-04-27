document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('form');
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate form
        if (!nameInput.value || !emailInput.value || !passwordInput.value || !confirmPasswordInput.value) {
            alert('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        // Kiểm tra mật khẩu khớp nhau
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert('Mật khẩu xác nhận không khớp!');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fullName: nameInput.value,
                    email: emailInput.value,
                    password: passwordInput.value
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Đăng ký thành công!');
                window.location.href = 'login.html'; // Chuyển về trang đăng nhập
            } else {
                alert(data.message || 'Đăng ký thất bại!');
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Đã xảy ra lỗi khi đăng ký!');
        }
    });
});