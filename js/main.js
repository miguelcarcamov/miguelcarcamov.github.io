
(function(){
        "use strict";

        /* Varibles
        -------------*/
        var windowWidth = $(window).width(),
            windowHeight = $(window).height(),
            $hashLink = $('.main_menu  > ul li a');



        // Set current Active section on new tabs or window
        var link = window.location.href,
            hashPosition = link.indexOf('#'),
            hash = link.substr(hashPosition,link.length);

        if(hash.indexOf('#') > -1){
            if($(hash).length){
                $(hash).addClass('active').siblings().removeClass('active');
            }
            $hashLink.each(function(e){
                $(this).attr('href') == hash ? $(this).parent('li').addClass('active').siblings().removeClass('active'): '';
            })
        }
        else{
            $('#home').addClass('active');
        }

        //page transition
        var $pages = $('.single_page'),
            currentActivePage = $('.single_page.active')[0],
            prevIndex = Array.prototype.indexOf.call($pages, currentActivePage),
            currentActiveIndex;
            console.log(prevIndex);

        $hashLink.on('click',function (e) {
            //get current Elem and Index
            var $toBeActivated = $(e.currentTarget.hash);
            currentActiveIndex = Array.prototype.indexOf.call($pages, $($toBeActivated)[0]);

            //Set animation according to order
            if(prevIndex < currentActiveIndex){
                $(currentActivePage).addClass('translateToLeft');
                $toBeActivated.addClass('active translateFromLeft').siblings().removeClass('active translateFromLeft translateFromRight');
            }
            else if( prevIndex > currentActiveIndex){
                $(currentActivePage).addClass('translateToRight');
                $toBeActivated.addClass('active translateFromRight').siblings().removeClass('active translateFromRight translateFromLeft');
            }

            //active current item
            $(this).parent('li').addClass('active').siblings().removeClass('active');
            // update state
            prevIndex = currentActiveIndex;
            currentActivePage = $toBeActivated[0];
        });

        // Remove Class after page Transition
        $pages.on('animationend', function(){
            $(this).removeClass('translateToLeft translateToRight');
        });

        if(windowHeight < 734){
             $('.slider_are, .single_slider_content').css('height','740px')
        }

        // Mobile menu css
        var $menu_toggler = $('.menu_toggler'),
            $menuSidebar = $('aside.nav_sidebar');

        $menu_toggler.on('click',function () {
            $(this).toggleClass('open');
            $menuSidebar.toggleClass('open');
        });
        if(windowWidth < 768){$menuSidebar.toggleClass('shrinked');}

        // collapsible menu css
        $('.toggle_icon span').on('click', function () {
            $menuSidebar.toggleClass('shrinked');
        });


        // Hero area typing effect
        if($(".typed p span").length){
            $(".typed p span").typed({
                strings: ["Miguel Cárcamo", "a computer scientist","a radio astronomer."],
                typeSpeed: 50
            });
        }


        // Camera slider
        var $cameraSlider = $('.hero_slider');
        if($cameraSlider.length){
            /*camera slider*/
            $cameraSlider.camera({
                height: windowHeight+'px',
                pagination: false,
                thumbnails: false,
                loader: false,
                playPause: false,
                fx: 'random',
            });
        }

        // Skill bar animation
        var $skillLabel = $('.single_skill .labels span'),
        $singleSkill = $('.single_skill');
        $('.percent_indicator').fadeOut();

        $('.resume').scroll(function(){
            if($singleSkill.offset().top < 300){
                 $skillLabel.each(function(i,elem){
                    var $this = $(elem);
                    var width = parseInt($this.attr('data-width'),10);
                    var innerValue = parseInt($this.html());
                    var update = setInterval(chekUpdate,5);
                    function chekUpdate(){
                        if(innerValue < width){
                               innerValue ++;
                               $this.html(innerValue+'%');
                               $('.percent_indicator').fadeIn();
                               $this.parent().siblings('.progress').find('.progress-bar').css('width', innerValue+'%')
                        }
                        else {
                               clearInterval(update);
                        }
                    }
                 });
            }
        });

      /* accordion jquery */
      $('.panel-title > a').on('click', function(){
           //  cache selectors
           var $activeClassHolder = $('.single_acco_title');
           var $indicator = $(this).find('.material-icons.indicator');

           // toggle accodrion indicator
           $indicator.text() === 'remove' ? $indicator.text('add') : $indicator.text('remove');
           $('.material-icons.indicator').not($indicator).text('add');

           //  toggle active class for open accordions
           $(this).parents($activeClassHolder).toggleClass('active');
           $activeClassHolder.not($(this).parents($activeClassHolder)).removeClass('active');
      });

        // custom nav trigger function for owl casousel
        function customTrigger(slideNext,slidePrev,targetSlider){
            $(slideNext).on('click', function() {
                targetSlider.trigger('next.owl.carousel');
            });
            $(slidePrev).on('click', function() {
                targetSlider.trigger('prev.owl.carousel');
            });
        }

        /*========= all sliders js =========*/
        // TESTIMONIAL SLIDER
        var testimonial_wrapper = $('.testimonial_wrapper');
        testimonial_wrapper.owlCarousel({
            items: 1,
            autoplay: true,
            animateOut: 'fadeOut',
            animateIn: 'fadeIn',
            loop: true,
            nav: false,
            margin: 70,
            dots: true
        });

        //custom trigger for testimonial slider
        customTrigger('.slider_nav .nav_right','.slider_nav .nav_left',testimonial_wrapper);

        // CLIENTS SLIDER
        var clients_slider = $('.clinet_slider');
        clients_slider.owlCarousel({
            items: 5,
            autoplay: false,
            loop: true,
            nav: false,
            responsive:{
                0:{
                    items:1
                },
                479:{
                    items: 2
                },
                991:{
                    items:5
                },
                1000:{
                    items:5
                }
            }
        });


        /* Single portfolio image slider */
        var $project_img_slider = $('.project_img_slider');
        if($project_img_slider.length){
            $project_img_slider.owlCarousel({
                loop:true,
                nav: false,
                autoplay: false,
                dots: false,
                items: 1
            });
        }

        // customTrigger single portfolio slider
        customTrigger('.project_nav_left','.project_nav_right', $project_img_slider );


        /*COUNTER UP*/
        $('.count_up').counterUp({
            delay: 10,
            time: 1000
        });

        //venoboxinit
        $('.venobox').venobox();

        /* Video background (Tubuler) init */
        var options = { videoId: 'UWK68I1uLZs', start: 3 };
        $('.video_version .site').tubular(options);

        /* preloader js */
        $(window).load(function(){
            $('.preloader_inner').fadeOut(1000);
            $('.preloader-bg').delay('500').fadeOut(1000);


            /*portfolio sorting*/
            $('.filter_area li').on( 'click', function() {
                $(this).addClass('active');
                $('.filter_area li').not(this).removeClass('active');
            });

        });

        /* PHP mail process */
        var contactForm = $(".contact_form");
        contactForm.on('submit', function (e) {
            // var _this = $(this),
            e.preventDefault();
            var resposeMsg = $('.respone_message');

            /* Ajax request */
            $.ajax({
                url: "form-process.php",
                type: "POST",
                data: contactForm.serialize(),
                beforeSend: function () {
                    resposeMsg.html("<div class='alert alert-info'><p>Loading ...</p></div>");
                },
                success: function (text) {
                    if (text === "success") {
                        resposeMsg.html("<div class='alert alert-success'><p><i class='fa fa-check' aria-hidden='true'></i>Message has been sent successfully.</p></div>");
                    } else {
                        if(text.length < 0){
                            resposeMsg.html("<div class='alert alert-danger'><p>All fields are required!</p></div>");
                        }
                        else{
                             resposeMsg.html("<div class='alert alert-danger'><p>" + text + " is required!</p></div>");
                        }

                    }
                }
            });
            return false;
        });

        /* Load blog posts from JSON file */
        function loadBlogPosts() {
            $.getJSON('blog-posts.json', function(data) {
                var container = $('#blog-posts-container');
                container.empty();
                
                if (data.length === 0) {
                    container.html('<div class="col-md-12"><p style="text-align: center; padding: 40px; color: #999;">No blog posts yet. Check back soon!</p></div>');
                    return;
                }
                
                $.each(data, function(index, post) {
                    var blogHtml = '<div class="col-md-4 col-sm-6 md-half-width">' +
                        '<article class="single_blog">' +
                        '<figure>' +
                        '<img src="' + post.image + '" alt="' + post.title + '">' +
                        '</figure>' +
                        '<div class="blog_content">' +
                        '<a href="' + post.link + '"><h4 class="blog_title">' + post.title + '</h4></a>' +
                        '<div class="date"><p>' + post.date + '</p></div>' +
                        '<p>' + post.excerpt + '</p>' +
                        '<ul class="meta_data">' +
                        '<li class="auth"><img src="images/auth.jpg" alt="Author Avatar"> <p>By ' + post.author + '</p></li>' +
                        '<li class="tag"><span class="pe-7s-ticket"></span> <p>' + post.category + '</p></li>' +
                        '</ul>' +
                        '</div>' +
                        '</article>' +
                        '</div>';
                    container.append(blogHtml);
                });
            }).fail(function() {
                // If JSON file doesn't exist or fails to load, show empty state
                $('#blog-posts-container').html('<div class="col-md-12"><p style="text-align: center; padding: 40px; color: #999;">No blog posts yet. Check back soon!</p></div>');
            });
        }
        
        // Load blog posts when page is ready
        $(document).ready(function() {
            loadBlogPosts();
        });
})(jQuery);
