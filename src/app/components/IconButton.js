import '../globals.css'
import styles from './IconButton.module.scss'

function Button(props) {
    const variant = props
    const {textValue} = props
    const {icon} = props
    return (
        <button className={`${styles.Main} ${styles[props.variant] || ""}`}>
            <span>{textValue}</span>
            {icon}
        </button>
    );
}

export default Button;
