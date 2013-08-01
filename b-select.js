/** b-select - customizable <select> based on DropKick(https://github.com/robdel12/DropKick) */
(function ($, window, document) {

  var methods = {},
    lists   = [],
    keyMap = {
      'left':  37,
      'up':    38,
      'right': 39,
      'down':  40,
      'enter': 13,
      'tab':   9
    },
    dropdownTemplate = [
      '<div class="b-select" id="b-select_{{ id }}">',
        '<a class="b-select__toggle">',
          '<span class="b-select__label">{{ label }}</span>',
        '</a>',
        '<div class="b-select__options">',
          '<ul class="b-select__options-inner">',
          '</ul>',
        '</div>',
      '</div>'
    ].join(''),
    optionTemplate = '<li class="{{ current }}"><a data-dk-dropdown-value="{{ value }}">{{ text }}</a></li>',
    defaults = {
      theme  : false,
      change : false
    };

  methods.init = function (settings) {
    settings = $.extend({}, defaults, settings);

    return this.each(function () {
      var $select = $(this),
        // Store a reference to the originally selected <option> element
        $original = $select.find(':selected').first(),
        // Save all of the <option> elements
        $options = $select.find('option'),
        // We store lots of great stuff using jQuery data
        data = $select.data('dropkick') || {},
        // This gets applied to the 'b-select' element
        id = $select.attr('id') || $select.attr('name'),
        // This gets updated to be equal to the longest <option> element
        minWidth = settings.width || $select.outerWidth(),
        // The completed b-select element
        $dk = false,
        theme;

      // Dont do anything if we've already setup dropkick on this element
      if (data.id) {
        return $select;
      } else {
        data.settings  = settings;
        data.id        = id;
        data.$original = $original;
        data.$select   = $select;
        data.value     = _notBlank($select.val()) || _notBlank($original.attr('value'));
        data.label     = $original.text();
        data.options   = $options;
      }

      // Build the dropdown HTML
      $dk = _build(dropdownTemplate, data);

      // Make the dropdown fixed width if desired
      $dk.find('.b-select__toggle').css({
        'min-width' : minWidth + 'px'
      });

      $dk.addClass($select[0].className);

      // Hide the <select> list and place our new one in front of it
      $select.before($dk);

      // Update the reference to $dk
      $dk = $('#b-select_' + id).show();

      // Save the current theme
      theme = settings.theme ? settings.theme : 'default';
      $dk.addClass('dk_theme_' + theme);
      data.theme = theme;

      // Save the updated $dk reference into our data object
      data.$dk = $dk;

      // Save the dropkick data onto the <select> element
      $select.data('dropkick', data);

      // Do the same for the dropdown, but add a few helpers
      $dk.data('dropkick', data);

      lists[lists.length] = $select;

      // Focus events
      $dk.add($select).bind('focus.dropkick', function() {
        $dk.addClass('b-select_focus');
      }).bind('blur.dropkick', function() {
        $dk.removeClass('b-select_open b-select_focus');
      });
    });
  };

  // Allows dynamic theme changes
  methods.theme = function (newTheme) {
    var $select = $(this),
      list      = $select.data('dropkick'),
      $dk       = list.$dk,
      oldtheme  = 'dk_theme_' + list.theme;

    $dk.removeClass(oldtheme).addClass('dk_theme_' + newTheme);

    list.theme = newTheme;
  };

  // Reset all <selects and dropdowns in our lists array
  methods.reset = function () {
    for (var i = 0, l = lists.length; i < l; i++) {
      var listData = lists[i].data('dropkick'),
        $dk        = listData.$dk,
        $current   = $dk.find('li').first();

      $dk.find('.b-select__label').text(listData.label);
      $dk.find('.b-select__options-inner').animate({ scrollTop: 0 }, 0);

      _setCurrent($current, $dk);
      _updateFields($current, $dk, true);
    }
  };

  // Reload / rebuild, in case of dynamic updates etc.
  // Credits to Jeremy (http://stackoverflow.com/users/1380047/jeremy-p)
  methods.reload = function () {
    var $select = $(this);
    var data = $select.data('dropkick');
    $select.removeData('dropkick');
    $('#b-select_' + data.id).remove();
    $select.dropkick(data.settings);
  };

  // Expose the plugin
  $.fn.dropkick = function (method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || ! method) {
      return methods.init.apply(this, arguments);
    }
  };

  // private
  function _handleKeyBoardNav(e, $dk) {
    var code   = e.keyCode,
      options  = $dk.find('.b-select__options'),
      open     = $dk.hasClass('b-select_open'),
      current  = $dk.find('.b-select__option_current'),
      first    = options.find('li').first(),
      last     = options.find('li').last(),
      next,
      prev;

    switch (code) {
      case keyMap.enter:
        if (open) {
          _updateFields(current.find('a'), $dk);
          _closeDropdown($dk);
        } else {
          _openDropdown($dk);
        }
        e.preventDefault();
      break;

      case keyMap.tab:
        if(open){
          _updateFields(current.find('a'), $dk);
          _closeDropdown($dk);
        }
      break;

      case keyMap.up:
        prev = current.prev('li');
        if (open) {
          if (prev.length) {
            _setCurrent(prev, $dk);
          } else {
            _setCurrent(last, $dk);
          }
        } else {
          _openDropdown($dk);
        }
        e.preventDefault();
      break;

      case keyMap.down:
        if (open) {
          next = current.next('li').first();
          if (next.length) {
            _setCurrent(next, $dk);
          } else {
            _setCurrent(first, $dk);
          }
        } else {
          _openDropdown($dk);
        }
        e.preventDefault();
      break;

      default:
      break;
    }
  }

  // Update the <select> value, and the dropdown label
  function _updateFields(option, $dk, reset) {
    var value, label, data, $select;

    value = option.attr('data-dk-dropdown-value');
    label = option.text();
    data  = $dk.data('dropkick');

    $select = data.$select;
    $select.val(value).trigger('change'); // Added to let it act like a normal select

    $dk.find('.b-select__label').text(label);

    reset = reset || false;

    if (data.settings.change && !reset) {
      data.settings.change.call($select, value, label);
    }
  }

  // Set the currently selected option
  function _setCurrent($current, $dk) {
    $dk.find('.b-select__option_current').removeClass('b-select__option_current');
    $current.addClass('b-select__option_current');

    _setScrollPos($dk, $current);
  }

  function _setScrollPos($dk, anchor) {
    var height = anchor.prevAll('li').outerHeight() * anchor.prevAll('li').length;
    $dk.find('.b-select__options-inner').animate({ scrollTop: height + 'px' }, 0);
  }

  // Close a dropdown
  function _closeDropdown($dk) {
    $dk.removeClass('b-select_open');
  }

  // Open a dropdown
  function _openDropdown($dk) {
    $dk.find('.b-select__options').css({ top : $dk.find('.b-select__toggle').outerHeight() - 1 });
    $dk.toggleClass('b-select_open');
  }

  /**
   * Turn the dropdownTemplate into a jQuery object and fill in the variables.
   */
  function _build (tpl, view) {
    var template = tpl, options = [], $dk;

    template = template.replace('{{ id }}', view.id);
    template = template.replace('{{ label }}', view.label);

    if (view.options && view.options.length) {
      for (var i = 0, l = view.options.length; i < l; i++) {
        var $option = $(view.options[i]),
          current   = 'b-select__option_current',
          oTemplate = optionTemplate;

        oTemplate = oTemplate.replace('{{ value }}', $option.val());
        oTemplate = oTemplate.replace('{{ current }}', (_notBlank($option.val()) === view.value) ? current : '');
        oTemplate = oTemplate.replace('{{ text }}', $option.text());

        options[options.length] = oTemplate;
      }
    }

    $dk = $(template);
    $dk.find('.b-select__options-inner').html(options.join(''));

    return $dk;
  }

  function _notBlank(text) {
    return ($.trim(text).length > 0) ? text : false;
  }

  $(function () {

    $('.b-select__options-inner').addClass('overthrow');

    // Handle click events on the dropdown toggler
    $(document).on('click', '.b-select__toggle', function() {
      var $dk  = $(this).parents('.b-select').first();

      _openDropdown($dk);

      return false;
    });

    // Handle click events on individual dropdown options
    $(document).on('click', '.b-select__options a', function() {
      var $option = $(this),
          $dk     = $option.parents('.b-select').first();

      _closeDropdown($dk);
      _updateFields($option, $dk);
      _setCurrent($option.parent(), $dk);

      return false;
    });

    // Setup keyboard nav
    $(document).bind('keydown.dk_nav', function(e) {
      var $open    = $('.b-select.b-select_open'),
        // Look for a focused dropdown
        $focused = $('.b-select.b-select_focus'),
        // Will be either $open, $focused, or null
        $dk = null;

      // If we have an open dropdown, key events should get sent to that one
      if ($open.length) {
        $dk = $open;
      } else if ($focused.length && !$open.length) {
        // But if we have no open dropdowns, use the focused dropdown instead
        $dk = $focused;
      }

      if ($dk.length) {
        _handleKeyBoardNav(e, $dk);
      }
    });

    $(document).on('keyup', function(e) {
      if (e.keyCode === 27) {
        _closeDropdown($('.b-select'));
      }
    });

    $(document).on('click', function(e) {
      if(!$(e.target).closest('.b-select').length) {
        _closeDropdown($('.b-select'));
      }
    });
  });

})(jQuery, window, document);



$('.b-select').dropkick({
  change: function (value/*, label*/) {
    console.log(value);
  }
});