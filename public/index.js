$(document).ready(function() {
       $('.fadeOnLoad').fadeIn(4000);
       $("html,body").animate({scrollTop: 1000}, 1000);
});


/*----------------------*/
/*-----------Contact Form--------*/

/*$(".fa-envelope").click(function(event) {
  $(".message").fadeIn(1000);
  $(".btn-outline-info").text("send");
});*/

function submit(event) {
  $(".btn-outline-info").text("Thank you for your message!");
  $(".message").delay(1000).fadeOut(2000);}



$(document).ready(function(){
     $("h1").animate({scrollTop: 100000}, 1000);
});


var app = document.getElementById('app');

var typewriter = new Typewriter(app, {
    loop: true
});

typewriter.typeString('Hello there!')
    .pauseFor(2500)
    .deleteAll()
    .typeString('Interested in BigTennis-News, but too laid back to regularly check this page?')
    .pauseFor(2500)
    .deleteChars(7)
    .typeString('<strong>Get our Newsletter!</strong>')
    .pauseFor(2500)
    .start();
