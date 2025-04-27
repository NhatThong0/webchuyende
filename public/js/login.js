document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput.value,
                    password: passwordInput.value
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                alert('Đăng nhập thành công!');
                window.location.href = 'home.html';
            } else {
                if (response.status === 404) {
                    alert('Email chưa được đăng ký!');
                } else if (response.status === 401) {
                    alert('Sai mật khẩu!');
                } else {
                    alert(data.message || 'Đăng nhập thất bại!');
                }
            }
        } catch (error) {
            console.error('Lỗi:', error);
            alert('Đã xảy ra lỗi khi đăng nhập!');
        }
    });
});