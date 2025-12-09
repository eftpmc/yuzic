// styles/sharedStyles.ts
import { StyleSheet, Platform } from 'react-native';


export const sharedStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    containerDark: {
        backgroundColor: '#000',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    section: {
        backgroundColor: '#1C1C1E',
        borderRadius: 10,
        marginVertical: 16,
        overflow: 'hidden',
    },
    sectionDark: {
        backgroundColor: '#1C1C1E',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Push left content and right icon apart
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    leftContent: {
        flexDirection: 'row', // Align icon and title horizontally
        alignItems: 'center',
    },
    rowIcon: {
        marginRight: 12, // Spacing between icon and title
    },
    rowText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'left',
    },
    rowTextDark: {
        color: '#fff',
        textAlign: 'left',
    },
    rowValue: {
        fontSize: 16,
        color: '#fff',
        textAlign: 'left',
    },
    rowValueDark: {
        color: '#ddd',
        textAlign: 'left',
    },
    divider: {
        height: 2,
        width: "100%",
        backgroundColor: '#000',
    },
    dividerContainer: {
        alignItems: 'center', // Centers the divider horizontally
        justifyContent: 'center',
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left',
    },
    headerDark: {
        color: '#eee',
        textAlign: 'left',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 8,
        paddingBottom: 16,
    },
    input: {
        marginTop: 8,
        marginBottom: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        fontSize: 16,
        color: '#000',
        backgroundColor: '#f9f9f9',
    },
    inputDark: {
        backgroundColor: '#111',
        borderColor: '#444',
        color: '#fff',
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
        marginBottom: 6,
        marginTop: 12,
        paddingHorizontal: 16, // <-- add this
    },
    fieldLabelDark: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ccc',
        marginBottom: 6,
        marginTop: 12,
        paddingHorizontal: 16, // <-- add this
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#666',  // Light mode
    },
    emptyTextDark: {
        color: '#999',  // Dark mode
    },
});