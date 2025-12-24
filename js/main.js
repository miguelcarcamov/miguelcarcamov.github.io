
(function(){
        "use strict";
        
        // Wait for sections to be loaded before initializing
        function initMainJS() {
            // Sections are now included directly by Jekyll, no need to wait for loading
            // All sections should be present in the DOM when this runs

        /* Variables
        -------------*/
        var windowWidth = $(window).width(),
            windowHeight = $(window).height(),
            $hashLink = $('.main_menu  > ul li a');



        //page transition
        var $pages = $('.single_page'),
            currentActivePage,
            prevIndex = 0,
            currentActiveIndex;

        // Initialize: Set current Active section on page load
        var link = window.location.href,
            hashPosition = link.indexOf('#'),
            hash = hashPosition > -1 ? link.substr(hashPosition, link.length) : '';

        // Remove active class from all sections first
        $pages.removeClass('active');
        
        if(hash && hash.indexOf('#') > -1){
            var $targetSection = $(hash);
            if($targetSection.length && $targetSection.hasClass('single_page')){
                $targetSection.addClass('active');
                currentActivePage = $targetSection[0];
                prevIndex = Array.prototype.indexOf.call($pages, currentActivePage);
                
                // Update menu
                $hashLink.each(function(){
                    if($(this).attr('href') == hash) {
                        $(this).parent('li').addClass('active').siblings().removeClass('active');
                    }
                });
            } else {
                // Hash section not found, default to home
                $('#home').addClass('active');
                currentActivePage = $('#home')[0];
                prevIndex = 0;
            }
        }
        else{
            // No hash, default to home
            $('#home').addClass('active');
            currentActivePage = $('#home')[0];
            prevIndex = 0;
        }

        $hashLink.on('click',function (e) {
            e.preventDefault();
            
            //get target section
            var targetHash = $(this).attr('href');
            var $toBeActivated = $(targetHash);
            
            // Check if we're on a blog post page (separate page, not main index)
            var isBlogPostPage = $('.single_post').length > 0;
            
            // If on blog post page and clicking a section link, go to main page
            if (isBlogPostPage && targetHash.indexOf('#') === 0) {
                window.location.href = '/' + targetHash;
                return;
            }
            
            // Check if target section exists on current page
            if ($toBeActivated.length === 0 || !$toBeActivated.hasClass('single_page')) {
                // If section doesn't exist, it might be a blog post or external link
                // Allow normal navigation
                if (targetHash.indexOf('#') === 0) {
                    // It's a hash link but section not found - might be on different page
                    // Try going to main page with hash
                    window.location.href = '/' + targetHash;
                }
                return;
            }
            
            // Don't do transition if clicking the same section
            // Check both by element reference and by active class
            if ($toBeActivated[0] === currentActivePage || $toBeActivated.hasClass('active')) {
                // Already on this section, do nothing
                return;
            }
            
            // Get index of target section
            currentActiveIndex = Array.prototype.indexOf.call($pages, $toBeActivated[0]);
            
            // Validate index
            if (currentActiveIndex === -1) {
                console.warn('Section not found in pages collection:', targetHash);
                console.warn('Available sections:', $pages.map(function() { return '#' + this.id; }).get());
                // Try refreshing the pages collection
                $pages = $('.single_page');
                currentActiveIndex = Array.prototype.indexOf.call($pages, $toBeActivated[0]);
                if (currentActiveIndex === -1) {
                    console.error('Section still not found after refresh:', targetHash);
                    return;
                }
            }

            // Always slide in the same direction (like turning pages in a book)
            // Current page slides left, new page comes from right
            
            // Remove transition classes from other pages (not current or target)
            var $otherPages = $pages.not($toBeActivated);
            if (currentActivePage) {
                $otherPages = $otherPages.not($(currentActivePage));
            }
            $otherPages.removeClass('translateFromLeft translateFromRight translateToLeft translateToRight active');
            
            // Animate current page out (slide left) if it exists and is different
            if (currentActivePage && currentActivePage !== $toBeActivated[0]) {
                var $currentPage = $(currentActivePage);
                $currentPage.removeClass('active translateFromLeft translateFromRight');
                $currentPage.addClass('translateToLeft');
            }
            
            // Animate new page in (slide from right) and make it active
            // Remove any existing transition classes first
            $toBeActivated.removeClass('translateFromRight translateToLeft translateToRight');
            $toBeActivated.addClass('active translateFromLeft');

            //active current menu item
            $(this).parent('li').addClass('active').siblings().removeClass('active');
            
            // Update URL hash without triggering page reload
            if (history.pushState) {
                history.pushState(null, null, targetHash);
            } else {
                window.location.hash = targetHash;
            }
            
            // update state
            prevIndex = currentActiveIndex;
            currentActivePage = $toBeActivated[0];
        });

        // Remove Class after page Transition
        $pages.on('animationend', function(e){
            // Only remove classes from the element that finished animating
            var $animatingElement = $(e.target);
            $animatingElement.removeClass('translateToLeft translateToRight translateFromLeft translateFromRight');
        });
        
        // Handle browser back/forward buttons
        $(window).on('hashchange', function() {
            var hash = window.location.hash;
            if (hash) {
                var $targetSection = $(hash);
                if ($targetSection.length && $targetSection.hasClass('single_page')) {
                    // Update active states
                    $pages.removeClass('active');
                    $targetSection.addClass('active');
                    
                    // Update menu
                    $hashLink.parent('li').removeClass('active');
                    $hashLink.filter('[href="' + hash + '"]').parent('li').addClass('active');
                    
                    // Update current page reference
                    currentActivePage = $targetSection[0];
                    prevIndex = Array.prototype.indexOf.call($pages, currentActivePage);
                }
            }
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
        if($(".typed-text").length){
            $(".typed-text").typed({
                strings: [
                    "Hello",
                    "I'm Miguel Carcamo",
                    "I'm a radio astronomer",
                    "I'm a computer scientist",
                    "I explore the universe",
                    "I study cosmic signals",
                    "I build scientific software",
                    "I analyze astronomical data",
                    "I'm passionate about research",
                    "Welcome to my website"
                ],
                typeSpeed: 50,
                backSpeed: 30,
                backDelay: 2000,
                loop: true,
                showCursor: true
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

        /* Contact form handling (mailto: - opens email client, no signup required) */
        var contactForm = $(".contact_form");
        contactForm.on('submit', function (e) {
            e.preventDefault();
            var resposeMsg = $('.respone_message');
            var form = $(this);
            
            // Get form values
            var name = $('#contact-name').val().trim();
            var email = $('#contact-email').val().trim();
            var phone = $('#contact-phone').val().trim() || 'Not provided';
            var web = $('#contact-web').val().trim() || 'Not provided';
            var message = $('#contact-message').val().trim();
            
            // Validation
            var errorMSG = [];
            if (!name) errorMSG.push('Name');
            if (!email) {
                errorMSG.push('Email');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errorMSG.push('Invalid email format');
            }
            if (!message) errorMSG.push('Message');
            
            if (errorMSG.length > 0) {
                resposeMsg.html("<div class='alert alert-danger'><p>" + errorMSG.join(', ') + " is required!</p></div>");
                return false;
            }
            
            // Prepare email body (same format as PHP version)
            var emailBody = "Name: " + name + "\n";
            emailBody += "Email: " + email + "\n";
            emailBody += "Phone: " + phone + "\n";
            emailBody += "Website: " + web + "\n\n";
            emailBody += "Message:\n" + message;
            
            // Encode for mailto URL
            var subject = encodeURIComponent("New Message Received from Website");
            var body = encodeURIComponent(emailBody);
            var recipient = "miguel.carcamo@usach.cl";
            
            // Create mailto link
            var mailtoLink = "mailto:" + recipient + "?subject=" + subject + "&body=" + body;
            
            // Open email client
            window.location.href = mailtoLink;
            
            // Show success message
            resposeMsg.html("<div class='alert alert-success'><p><i class='fa fa-check' aria-hidden='true'></i> Your email client should open. If it doesn't, please send an email to <a href='mailto:" + recipient + "'>" + recipient + "</a></p></div>");
            
            // Reset form after a short delay
            setTimeout(function() {
                form[0].reset();
            }, 1000);
            
            return false;
        });

        /* Blog posts are now rendered by Jekyll directly in the HTML */
        /* No JavaScript loading needed - posts are included server-side */
        
        } // End initMainJS function
        
        // Start initialization
        initMainJS();
})(jQuery);
