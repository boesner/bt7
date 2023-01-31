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

