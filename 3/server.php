<?php
// filepath: /c:/Web/3/server.php

// GET 요청으로 전달된 id와 pw 값을 가져옵니다.
$id = $_GET['id'] ?? '아이디가 입력되지 않았습니다.';
$pw = $_GET['pw'] ?? '비밀번호가 입력되지 않았습니다.';

// id와 pw를 출력합니다.
echo "입력된 아이디: " . htmlspecialchars($id) . "<br>";
echo "입력된 비밀번호: " . htmlspecialchars($pw);
?>