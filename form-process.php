<?php



$EmailTo = "example@example.com";

$Subject = "New Message Received";



$errorMSG = array();

$name = $email = $phone = $web = $description = null;


// NAME

if (empty($_POST["name"])) {

    $errorMSG[]= "Name";

} else {

    $name = $_POST["name"];

}



// EMAIL



if (empty($_POST["email"])) {

    $errorMSG[]= "Email";

} else {

    $email = $_POST["email"];

}



// PHONE



if (empty($_POST["phone"])) {

    $errorMSG[]= "Phone";

} else {

    $phone = $_POST["phone"];

}



// WEB

if (empty($_POST["web"])) {

    $errorMSG[]= "Web address";

} else {

    $web = $_POST["web"];
}

// DESCRIPTION
if (empty($_POST["description"])) {

    $errorMSG[]= "description";

} else {

    $description = $_POST["description"];
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

$headers .= 'Content-type: text/html; charset=iso-8859-1' . "\r\n";

$headers .= 'From:  ' . $name . ' <' . $email .'>' . " \r\n" .

            'Reply-To: '.  $email . "\r\n" .

            'X-Mailer: PHP/' . phpversion();



if($name && $email && $phone && $web && $description){

    $success = mail($EmailTo, $Subject, $Body, $headers );

}else{

    $success = false;

}





if ($success && empty($errorMSG) ){

   echo "success";

}else{
    echo json_encode($errorMSG);
} 