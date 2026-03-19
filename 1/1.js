function checkPassword(){
            if(document.getElementById('password').value.length < 8){
                alert('비밀번호는 8자 이상 입력하세요!');
            }
        }