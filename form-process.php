<?php

$EmailTo = "miguel.carcamo@usach.cl";

$Subject = "New Message Received from Website";

$errorMSG = array();

$name = $email = $phone = $web = $description = null;

// NAME
if (empty($_POST["name"])) {
    $errorMSG[]= "Name";
} else {
    $name = filter_var($_POST["name"], FILTER_SANITIZE_STRING);
}

// EMAIL
if (empty($_POST["email"])) {
    $errorMSG[]= "Email";
} else {
    $email = filter_var($_POST["email"], FILTER_SANITIZE_EMAIL);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errorMSG[]= "Invalid email format";
    }
}

// PHONE (Optional)
if (!empty($_POST["phone"])) {
    $phone = filter_var($_POST["phone"], FILTER_SANITIZE_STRING);
} else {
    $phone = "Not provided";
}

// WEB (Optional)
if (!empty($_POST["web"])) {
    $web = filter_var($_POST["web"], FILTER_SANITIZE_URL);
} else {
    $web = "Not provided";
}

// DESCRIPTION
if (empty($_POST["description"])) {
    $errorMSG[]= "Message";
} else {
    $description = filter_var($_POST["description"], FILTER_SANITIZE_STRING);
}

// prepare email body text
$Body = null;
$Body .= "<p><b>Name:</b> {$name}</p>";
$Body .= "<p><b>Email:</b> {$email}</p>";
$Body .= "<p><b>Phone:</b> {$phone}</p>";
$Body .= "<p><b>Website:</b> {$web}</p>";
$Body .= "<p><b>Message:</b> </p><p>{$description}</p>";

// send email
$headers = 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
$headers .= 'From:  ' . $name . ' <' . $email .'>' . " \r\n" .
            'Reply-To: '.  $email . "\r\n" .
            'X-Mailer: PHP/' . phpversion();

if($name && $email && $description && empty($errorMSG)){
    $success = mail($EmailTo, $Subject, $Body, $headers );
}else{
    $success = false;
}

if ($success && empty($errorMSG) ){
   echo "success";
}else{
    echo json_encode($errorMSG);
}
