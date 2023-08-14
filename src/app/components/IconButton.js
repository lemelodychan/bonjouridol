function Button(props) {
    const {variant} = props
    const {textValue} = props
    const {icon} = props
    return (
        <button className={`btn ${ variant }`}>
            <span>{textValue}</span>
            {icon}
        </button>
    );
}

export default Button;
