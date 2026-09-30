# Props and styles by element type

Generated from `kit/prototype.schema.json` by `scripts/gen-props.mjs`; do not edit by hand.
Use it to find which key controls something; look at an existing element of the same type for real values.

Value shapes: `color` = `{ "value": "#rrggbb", "unit": "hex" }`; `len(px|%)` = `{ "value": 16, "unit": "px" }`;
`font` = `{ "value": "Inter", "unit": "google" }`; `=x` = `{ "value": x }`; `action` = see `logic.md`;
`visibility` = `{ "type": "const", "value": true }` or a rule (see `logic.md`). Style keys are optional; unset = theme default.
`SHADOW` = shadowOffsetX:len, shadowOffsetY:len, shadowBlurRadius:len, shadowSpreadRadius:len, shadowColor:color.
`FONT` = fontFamily:font, fontSize:len(px|em), fontWeight:="inherit" or number.
`PAD` = paddingHorizontal:len, paddingVertical:len.
`BOX` = borderWidth:len, borderRadius:len, borderColor:color, backgroundColor:color.

## Screen

- `props`: type:default|auth|checkout|finish|paywall|upsell, header:{back:boolean, counter:boolean, progressBar:boolean, title:string, image:string, alt:string, imagePos:left|right}, autoNavigation:{enabled:boolean, delay:number}
- `styles`:
  - `container`: alignItems:=left|center|right, backgroundImage:{value:string, repeat:no-repeat|repeat|repeat-x|repeat-y, position:center|top|bottom|left|right, size:auto|cover|contain}, backgroundVideo:{url:string, position:center|top|bottom, size:auto|cover|contain}, backgroundColor:color, paddingBottom:len, paddingHorizontal:len, paddingTop:len
  - `progressBar`: textColor:color, titleFontFamily:font, titleFontSize:len(px|em), titleFontWeight:="inherit" or number, lineColor:color, lineBgColor:color, lineHeight:len, logoSize:len, backColor:color, counterCurrentColor:color, counterSeparatorColor:color, counterTotalColor:color

## Elements

Every element: `{ id, type, customId?, visibility?, props, styles }`.
BASE element `styles.container` keys: spacingTop:len, spacingBottom:len, spacingHorizontal:len, BOX, PAD, SHADOW, position:=fixed|static|float|sticky, bottom:len, top:len, width:len, height:len, align:=left|center|right

### Container

- `props`: orientation:horizontal|vertical
- `styles`:
  - `container`: BASE + gap:len, columnSizes:[number], vAlign:=start|center|end|stretch, hAlign:=start|center|end|stretch

### Carousel

- `props`: loop:boolean, autoplay:boolean, durationSec:len
- `styles`:
  - `container`: BASE
  - `slide`: size:len, spacing:len

### Popup

- `props`: showClose:boolean, modal:boolean, animation:fade|slide
- `styles`:
  - `container`: BASE + placement:auto|top|center|bottom, backdropColor:color

### Text

- `props`: type:h1|h2|paragraph, content:string, contentType:text|html, animation:off|slow|medium|fast|rapid
- `styles`:
  - `container`: BASE
  - `paragraph`: color:color, FONT, lineHeight:len, textAlign:=left|center|right
  - `h1`: same keys as Text.paragraph
  - `h2`: same keys as Text.paragraph
  - `h3`: same keys as Text.paragraph
  - `link`: color:color, fontWeight:="inherit" or number, textDecoration:=none|underline|overline|line-through|inherit

### Raw

- `props`: __html:string, preserveFormatting:boolean
- `styles`:
  - `container`: BASE

### Button

- `props`: action:action, text:string, fixed:boolean
- `styles`:
  - `button`: width:len, BOX, PAD, color:color, FONT, lineHeight:len, textAlign:=left|center|right, effect:none|pulse, animationDuration:len, animationEasing:linear|ease|ease-in|ease-out|ease-in-out or string, pulseShadowColor:color, pulseShadowSize:len, pulseButtonGrow:len
  - `container`: BASE

### OAuthButton

- `props`: provider:firebase|supabase, type:facebook|google|apple, text:string, actions:{successSignIn:action, successSignUp:action, fail:action}
- `styles`:
  - `container`: BASE
  - `button`: same keys as Button.button

### WalletButton

- `props`: text:string, configSource:linked|independent, linkedElementId:string, paymentConfig:object, fallbackAction:action, fallbackText:string
- `styles`:
  - `container`: BASE
  - `button`: same keys as Button.button

### Input

- `props`: placeholder:string, type:text|email|number|phone|password, required:boolean, validate:boolean, blockNavigateIfAuthFailed:boolean, min:number, max:number, transform:uppercase|lowercase|capitalize-words|capitalize-sentences, consent:{enabled:boolean, value:boolean, text:string}
- `styles`:
  - `input`: width:len, height:len, PAD, BOX, invalidColor:color, invalidBorderColor:color, invalidBackgroundColor:color, focusBorderColor:color, focusBackgroundColor:color, color:color, FONT, lineHeight:len, textAlign:=left|center|right
  - `errorText`: color:color, fontFamily:font, fontSize:len(px|em)
  - `container`: BASE
  - `placeholder`: color:color
  - `consentCheckbox`: borderColor:color, backgroundColor:color, activeBorderColor:color, activeBackgroundColor:color
  - `consentText`: color:color, FONT

### Authorization

- `props`: providers:{email:{enabled,id}, facebook:{enabled,id}, google:{enabled,id}, apple:{enabled,id}}, input:{placeholder:string, transform:string}, required:boolean
- `styles`:
  - `container`: BASE
  - `button`: same keys as Button.button
  - `input`: same keys as Input.input
  - `placeholder`: same keys as Input.placeholder

### DatePicker

- `props`: format:dd-mm-yyyy|mm-dd-yyyy, inputType:select|input, min:{value:number, unit:days|months|years, type:"relative"}, max:{value:number, unit:days|months|years, type:"relative"}, required:boolean, placeholders:{day:string, month:string, year:string}
- `styles`:
  - `container`: BASE
  - `wrapper`: gap:len
  - `input`: height:len, BOX, PAD, color:color, FONT, textAlign:=left|center|right, lineHeight:len

### PriceOptions

- `props`: required:boolean, defaultPrice:string, prices:[{id,customId,text,badge}]
- `styles`:
  - `container`: BASE + columns:len, gap:len
  - `option`: height:len, BOX, align:=left|center|right, PAD, color:color, fontSize:len(px|em), fontWeight:="inherit" or number
  - `badge`: textColor:color, backgroundColor:color
  - `activeOption`: backgroundColor:color, borderColor:color, color:color

### Options

- `props`: required:boolean, action:action, multi:boolean, checkboxes:boolean, layout:list|image-tiles, maxSelect:number, defaultValue:string, options:[{id,text,image,rightImage,value,visible,deselectOthers,selectAll}], columns:number
- `styles`:
  - `container`: BASE + verticalGap:len, horizontalGap:len
  - `option`: height:len, BOX, align:=left|center|right, PAD, color:color, FONT, activeBgColor:color, activeBorderColor:color, activeTextColor:color
  - `image`: borderRadius:len, cover:boolean

### Image

- `props`: url:string, width:number, height:number, alt:string
- `styles`:
  - `container`: BASE
  - `image`: opacity:len, align:=left|center|right, borderRadius:len, height:len, width:len, objectFit:=contain|fill|cover

### List

- `props`: items:[{id,text,marker}]
- `styles`:
  - `container`: BASE + rowGap:len, columnGap:len, justify:=start|center|end
  - `value`: color:color, FONT, lineHeight:len
  - `markerContainer`: verticalAlign:=baseline|middle|bottom
  - `markerText`: color:color, fontSize:len(px|em), fontWeight:="inherit" or number, lineHeight:len
  - `markerImage`: same keys as Image.image

### FAQ

- `props`: showArrow:boolean, items:[{id,title,answer,open}]
- `styles`:
  - `container`: BASE
  - `item`: borderColor:color, borderWidth:len, paddingVertical:len, gap:len
  - `question`: same keys as Text.paragraph
  - `answer`: color:color, FONT, lineHeight:len, textAlign:=left|center|right, gap:len

### Spinner

- `props`: (none)
- `styles`:
  - `container`: BASE
  - `spinner`: color:color, fill:color, size:len, align:=left|center|right

### Loader

- `props`: type:linear|circular, action:action, progressAction:action, duration:len(s|m|h), showPercent:boolean
- `styles`:
  - `container`: BASE
  - `percentText`: color:color, fontSize:len(px|em), fontWeight:="inherit" or number
  - `loader`: colorStart:color, colorEnd:color, colorBg:color, borderRadius:len, height:len, circleWidth:len

### Reviews

- `props`: type:list|carousel, duration:len(s|m|h), reviews:[{id,title,text,author}]
- `styles`:
  - `container`: BASE
  - `review`: color:color, backgroundColor:color, PAD, textAlign:=left|center|right

### Chart

- `props`: lineType:exp-up|exp-down|log-up|log-down|waves-up|waves-down, leftBadge:string, rightBadge:string, x1Label:string, x2Label:string, dateRange:len(day|week|month|year), animationDurationMs:number
- `styles`:
  - `container`: BASE
  - `chart`: colorPrimary:color, colorSecondary:color, colorBackground:color, lineWidth:len, gridLinesColor:color, dashWidth:len, leftPointBgColor:color, rightPointBgColor:color
  - `badges`: color:color, textAlign:=left|center|right, FONT, lineHeight:len, textDecoration:=none|underline|overline|line-through|inherit, width:len, height:len, BOX, paddingTop:len, paddingBottom:len, PAD, marginHorizontal:len, marginVertical:len, SHADOW, leftBadgeColor:color, rightBadgeColor:color, leftBadgeBgColor:color, rightBadgeBgColor:color
  - `xAxis`: color:color, textAlign:=left|center|right, FONT, lineHeight:len, textDecoration:=none|underline|overline|line-through|inherit, x1LabelColor:color, x2LabelColor:color, xLabelFontSize:len

### Timer

- `props`: type:button|text|composite, duration:len(s|m|h), persistent:boolean, synchronizedCountdown:boolean, text:string, buttonText:string, completeAction:action, clickAction:action
- `styles`:
  - `container`: BASE
  - `button`: BOX, width:len, height:len, PAD, textAlign:=left|center|right, FONT, lineHeight:len, color:color
  - `text`: same keys as Text.paragraph
  - `countdown`: same keys as Text.paragraph

### Video

- `props`: url:string
- `styles`:
  - `container`: BASE
  - `video`: opacity:len, borderRadius:len, height:len, width:len, objectFit:=contain|fill|cover

### Lottie

- `props`: url:string, loop:boolean, speed:number, poster:string
- `styles`:
  - `container`: BASE
  - `lottie`: opacity:len, align:=left|center|right, height:len, width:len, objectFit:=contain|fill|cover

### CustomerCarousel

- `props`: durationSec:number, customers:[{text}]
- `styles`:
  - `container`: BASE + gap:len
  - `item`: width:len, height:len, BOX, paddingTop:len, paddingBottom:len, PAD, marginHorizontal:len, marginVertical:len, SHADOW, color:color, textAlign:=left|center|right, FONT, lineHeight:len, textDecoration:=none|underline|overline|line-through|inherit

### Scratch

- `props`: subtitle:string, discount:string, discountMessage:string, action:action
- `styles`:
  - `container`: BASE

### Totals

- `props`: checkout:string, totals:{product:{text}, total:{text}, next:{text}}
- `styles`:
  - `container`: (no keys)
  - `productGap`: value:number, unit:string
  - `productText`: same keys as Text.paragraph
  - `productPrice`: same keys as Text.paragraph
  - `discountGap`: same keys as Totals.productGap
  - `discountText`: same keys as Text.paragraph
  - `discountPrice`: same keys as Text.paragraph
  - `dividerGap`: same keys as Totals.productGap
  - `dividerColor`: value:string, unit:"hex"
  - `totalGap`: same keys as Totals.productGap
  - `totalText`: same keys as Text.paragraph
  - `totalPrice`: same keys as Text.paragraph
  - `nextGap`: same keys as Totals.productGap
  - `nextText`: same keys as Text.paragraph
  - `nextPrice`: same keys as Text.paragraph
  - `trialGap`: same keys as Totals.productGap
  - `trialText`: same keys as Text.paragraph
  - `trialPrice`: same keys as Text.paragraph

### Plan

- `props`: title:string, price:string, oldPrice:string, currency:string, badge:string, offerBadge:string, priceBlock:{price:string, oldPrice:string, label:string, oldPricePosition:top|left, period:day|week|month|year}, checkout:string, radiobutton:boolean, clickAction:action
- `styles`:
  - `container`: BASE
  - `plan`: width:len, height:len, BOX, paddingTop:len, paddingBottom:len, PAD, marginHorizontal:len, marginVertical:len, SHADOW, color:color, textAlign:=left|center|right, FONT, lineHeight:len, textDecoration:=none|underline|overline|line-through|inherit, primaryColor:color, textColor:color, numericFontFamily:font, titleFontSize:len(px|em), titleFontWeight:="inherit" or number, titleFontFamily:font, priceFontSize:len(px|em), priceFontWeight:="inherit" or number
  - `activePlan`: backgroundColor:color, borderColor:color, textColor:color
  - `badge`: color:color, textAlign:=left|center|right, FONT, lineHeight:len, textDecoration:=none|underline|overline|line-through|inherit, fullWidth:boolean, align:left|center|right, textColor:color, backgroundColor:color
  - `priceBlock`: color:color, textAlign:=left|center|right, FONT, lineHeight:len, textDecoration:=none|underline|overline|line-through|inherit, smallFractions:boolean, backgroundType:shape|none, wrapOldPrice:boolean, backgroundColor:color, digitsFontSize:len(px|em), digitsFontWeight:="inherit" or number, oldPriceFontSize:len(px|em), oldPriceFontWeight:="inherit" or number, labelFontSize:len(px|em), labelFontWeight:="inherit" or number, labelFontFamily:font
  - `activePriceBlock`: color:color, textAlign:=left|center|right, FONT, lineHeight:len, textDecoration:=none|underline|overline|line-through|inherit, backgroundColor:color, labelFontSize:len(px|em), labelFontWeight:="inherit" or number, labelFontFamily:font
  - `offerBadge`: width:len, height:len, BOX, paddingTop:len, paddingBottom:len, PAD, marginHorizontal:len, marginVertical:len, SHADOW, textColor:color, activeTextColor:color, activeBackgroundColor:color, activeBorderColor:color, fontSize:len(px|em), fontWeight:="inherit" or number
  - `radiobutton`: color:color, activeColor:color, size:len

### Plans

- `props`: required:boolean, defaultPlan:string, expandLabel:string
- `styles`:
  - `container`: BASE + gap:len
  - `plan`: same keys as Plan.plan
  - `activePlan`: same keys as Plan.activePlan
  - `badge`: same keys as Plan.badge
  - `priceBlock`: same keys as Plan.priceBlock
  - `activePriceBlock`: same keys as Plan.activePriceBlock
  - `radiobutton`: same keys as Plan.radiobutton

### Checkout

- `props`: methods:[object], providers:{stripe:{enabled,config}, primer:{enabled,config}, paddle:{enabled,config}, paypal:{enabled,config}, solidgate:{enabled,config}, fastspring:{enabled,config}}
- `styles`:
  - `errors`: color:color, bgColor:color
  - `container`: BASE + accentColor:color
  - `accordion`: gap:len, BOX, color:color, SHADOW
  - `button`: same keys as Button.button
  - `couponInput`: width:len, height:len, PAD, BOX, invalidColor:color, invalidBorderColor:color, invalidBackgroundColor:color, focusBorderColor:color, focusBackgroundColor:color, color:color, FONT, lineHeight:len, textAlign:=left|center|right, buttonTextColor:color

### Processing

- `props`: loaders:[{label,duration,doneText,progressAction}], action:action
- `styles`:
  - `container`: BASE
  - `text`: same keys as Input.consentText
  - `loaders`: colorStart:color, colorEnd:color, colorBg:color, borderRadius:len, height:len

### CookieConsent

- `props`: text:string, fixed:boolean, showPreferencesButton:string, savePreferencesButton:string, acceptAllButton:string, rejectAllButton:string, displayRejectAll:boolean, items:[{title,description,isNecessary,id}], action:action
- `styles`:
  - `body`: same keys as Text.paragraph
  - `button`: width:len, BOX, PAD, color:color, FONT, lineHeight:len, textAlign:=left|center|right, effect:none|pulse, animationDuration:len, animationEasing:linear|ease|ease-in|ease-out|ease-in-out or string, pulseShadowColor:color, pulseShadowSize:len, pulseButtonGrow:len, outlineColor:color
  - `container`: BASE
  - `title`: same keys as Text.paragraph
  - `popup`: background:color
