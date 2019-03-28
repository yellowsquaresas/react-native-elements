import React from "react";
import PropTypes from "prop-types";
import { TouchableOpacity, Modal, View, StatusBar } from "react-native";
import { observer, inject } from "mobx-react";
import { ViewPropTypes, withTheme } from "../config";
import { ScreenWidth, ScreenHeight, isIOS } from "../helpers";

import Triangle from "./Triangle";
import getTooltipCoordinate, {
  getElementVisibleWidth
} from "./getTooltipCoordinate";

@inject("globalStore") @observer
class Tooltip extends React.Component {
  state = {
    isVisible: false,
    yOffset: 0,
    xOffset: 0,
    elementWidth: 0,
    elementHeight: 0
  };

  renderedElement;

  toggleTooltip = () => {
    const { onClose } = this.props;
    this.getElementPosition();
    this.setState(prevState => {
      if (prevState.isVisible && !isIOS) {
        onClose && onClose();
      }

      return { isVisible: !prevState.isVisible };
    });
  };

  wrapWithPress = (toggleOnPress, children) => {
    if (toggleOnPress) {
      return (
        <TouchableOpacity onPress={() => {
          this.toggleTooltip();
          this.props.onPressMoreAction();
        }} activeOpacity={1}>
          {children}
        </TouchableOpacity>
      );
    }

    return children;
  };

  getTooltipStyle = () => {
    const { yOffset, xOffset, elementHeight, elementWidth } = this.state;
    const {
      height,
      backgroundColor,
      width,
      withPointer,
      containerStyle
    } = this.props;

    const { x, y } = getTooltipCoordinate(
      xOffset,
      yOffset,
      elementWidth,
      elementHeight,
      ScreenWidth,
      ScreenHeight,
      width,
      height,
      withPointer
    );

    const pastMiddleLine = yOffset > y;
    const direction = (pastMiddleLine ? 1 : -1);
    const top = y + (this.props.addYOffset ? this.props.addYOffset * direction : 0);
    let left = xOffset +
      getElementVisibleWidth(elementWidth, xOffset, ScreenWidth) / 2 -
      width / 2;
    if (left < 0 || left + width > ScreenWidth) {
      //FIXME this won't work in general cases, but more thanok for our usage
      if (width >= 0.94 * ScreenWidth) {
        left = (ScreenWidth - width) / 2;
      } else {
        left = x;
      }
    }


    return {
      position: "absolute",
      left: left,
      top: top,
      width,
      height,
      backgroundColor,
      // default styles
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      borderRadius: 10,
      padding: 10,
      ...containerStyle
    };
  };

  renderPointer = tooltipY => {
    const { yOffset, xOffset, elementHeight, elementWidth } = this.state;
    const { backgroundColor, pointerColor } = this.props;
    const pastMiddleLine = yOffset > tooltipY;
    const direction = (pastMiddleLine ? 1 : -1);
    const decay = (this.props.addYOffset ? this.props.addYOffset : 0);

    return (
      <View
        style={{
          position: "absolute",
          top: pastMiddleLine ? yOffset - 13 + decay : yOffset + elementHeight - 2 - decay,
          left:
            xOffset +
            getElementVisibleWidth(elementWidth, xOffset, ScreenWidth) / 2 -
            7.5
        }}
      >
        <Triangle
          style={{ borderBottomColor: pointerColor || backgroundColor }}
          isDown={pastMiddleLine}
        />
      </View>
    );
  };

  renderContent = withTooltip => {
    const { popover, withPointer, toggleOnPress, highlightColor } = this.props;

    if (!withTooltip) {
      return this.wrapWithPress(toggleOnPress, this.props.children);
    }

    const { yOffset, xOffset, elementWidth, elementHeight } = this.state;
    const tooltipStyle = this.getTooltipStyle();
    return (
      <View>
        <View
          style={{
            position: "absolute",
            top: yOffset,
            left: xOffset,
            backgroundColor: highlightColor,
            overflow: "visible",
            width: elementWidth,
            height: elementHeight
          }}
        >
          {this.props.children}
        </View>
        {withPointer && this.renderPointer(tooltipStyle.top)}
        <View style={tooltipStyle} testID="tooltipPopoverContainer">
          {popover}
        </View>
      </View>
    );
  };

  componentDidMount() {
    // wait to compute onLayout values.
    setTimeout(this.getElementPosition, 500);
  }

  getElementPosition = () => {
    this.renderedElement &&
    this.renderedElement.measure(
      (
        frameOffsetX,
        frameOffsetY,
        width,
        height,
        pageOffsetX,
        pageOffsetY
      ) => {
        this.setState({
          xOffset: pageOffsetX,
          yOffset: pageOffsetY,
          elementWidth: width,
          elementHeight: height
        });
      }
    );
  };

  render() {
    const { isVisible } = this.state;
    const { onClose, withOverlay, onOpen } = this.props;

    this.props.globalStore.tradeScreenStore.setToggleActiveTooltip(this.toggleTooltip);

    return (
      <View
        collapsable={false}
        ref={e => {
          this.renderedElement = e;
        }}
      >
        {this.renderContent(false)}
        <Modal
          animationType="none"
          visible={isVisible}
          transparent
          onDismiss={onClose}
          onShow={onOpen}
          onRequestClose={onClose}
        >
          <TouchableOpacity
            style={{ ...styles.container(withOverlay), ...this.props.overlayStyle }}
            onPress={this.toggleTooltip}
            activeOpacity={1}
          >
            {this.renderContent(true)}
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }
}

Tooltip.propTypes = {
  children: PropTypes.element,
  withPointer: PropTypes.bool,
  popover: PropTypes.element,
  toggleOnPress: PropTypes.bool,
  height: PropTypes.number,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  containerStyle: ViewPropTypes.style,
  pointerColor: PropTypes.string,
  onClose: PropTypes.func,
  onOpen: PropTypes.func,
  withOverlay: PropTypes.bool,
  backgroundColor: PropTypes.string,
  highlightColor: PropTypes.string
};

Tooltip.defaultProps = {
  withOverlay: true,
  highlightColor: "transparent",
  withPointer: true,
  toggleOnPress: true,
  height: 40,
  width: 150,
  containerStyle: {},
  backgroundColor: "#617080",
  onClose: () => {
  },
  onOpen: () => {
  }
};

const styles = {
  container: withOverlay => ({
    backgroundColor: withOverlay ? "rgba(255, 255, 255, 0.50)" : "transparent",
    flex: 1
  })
};

export { Tooltip };
export default withTheme(Tooltip, "Tooltip");
