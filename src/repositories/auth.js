const SportsAuth = {
    setUser(userData) {
        localStorage.setItem('sportsUser', JSON.stringify(userData));
    },
    
    getUser() {
        const user = localStorage.getItem('sportsUser');
        return user ? JSON.parse(user) : null;
    },

    logout() {
        localStorage.removeItem('sportsUser');
        window.location.href = 'login.html';
    }
};

window.SportsAuth = SportsAuth;